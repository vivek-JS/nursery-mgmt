/**
 * WhatsApp Message Parser for Order Messages
 * Parses Marathi/Hindi WhatsApp messages to extract order details
 */

// Plant name mappings (Marathi/Hindi to English)
const PLANT_MAPPINGS = {
  'टरबूज': 'Watermelon',
  'तरबूज': 'Watermelon',
  'watermelon': 'Watermelon',
  'काकडी': 'Cucumber',
  'cucumber': 'Cucumber',
  'मिरची': 'Chilli',
  'chilli': 'Chilli',
  'टोमॅटो': 'Tomato',
  'tomato': 'Tomato',
  // Add more mappings as needed
};

// Field labels in Marathi/Hindi
const FIELD_LABELS = {
  name: ['नाव', 'नाम', 'name'],
  village: ['गाव', 'गाँव', 'village'],
  taluka: ['तालुका', 'taluka', 'तहसील'],
  district: ['जिल्हा', 'जिला', 'district'],
  mobile: ['मोबाईल', 'मोबाइल', 'mobile', 'नंबर', 'number', 'contact'],
  plant: ['पौधा', 'plant'],
  subtype: ['subtype', 'विविधता'],
  quantity: ['रोपे', 'ropes', 'quantity', 'संख्या', 'किती', 'qty'],
  rate: ['भाव', 'rate', 'किंमत', 'price'],
  delivery: ['डिलिवरी', 'delivery', 'तारीख', 'date', 'डेट'],
};

/**
 * Parse WhatsApp message and extract order details
 * @param {string} message - The WhatsApp message text
 * @returns {Object} Parsed order details
 */
export const parseWhatsAppMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return { error: 'Invalid message format' };
  }

  const lines = message.split('\n').map(line => line.trim()).filter(line => line);
  
  const parsed = {
    name: null,
    village: null,
    taluka: null,
    district: null,
    mobileNumber: null,
    plant: null,
    subtype: null,
    quantity: null,
    rate: null,
    deliveryDate: null,
    paymentInfo: null,
    utrId: null,
  };

  try {
    // Extract mobile number (10 digits)
    const mobileMatch = message.match(/(?:मोबाईल|मोबाइल|mobile|नंबर|number)[\s:]*(\d{10})/i);
    if (mobileMatch) {
      parsed.mobileNumber = mobileMatch[1];
    } else {
      // Try to find any 10-digit number
      const anyMobileMatch = message.match(/\b(\d{10})\b/);
      if (anyMobileMatch) {
        parsed.mobileNumber = anyMobileMatch[1];
      }
    }

    // Extract name (usually after "नाव" or "नाम")
    const namePatterns = [
      /(?:नाव|नाम|name)[\s:]+([^\n]+)/i,
      /नवीन ऑर्डर\s*\n\s*(?:नाव|नाम)?\s*([^\n]+)/i, // Handle "नवीन ऑर्डर" format
    ];
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        parsed.name = match[1].trim();
        // Remove common prefixes
        parsed.name = parsed.name.replace(/^(श्री|श्रीमती|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
        // Stop at mobile, village, or other field labels
        parsed.name = parsed.name.split(/(?:मोबाईल|गाव|तालुका|जिल्हा|mobile|village|taluka|district)/i)[0].trim();
        if (parsed.name) break;
      }
    }

    // Extract village (usually after "गाव" or "गाँव")
    const villageMatch = message.match(/(?:गाव|गाँव|village)[\s:]+([^\n]+)/i);
    if (villageMatch) {
      parsed.village = villageMatch[1].trim();
    }

    // Extract taluka (usually after "तालुका" or "तहसील")
    const talukaMatch = message.match(/(?:तालुका|तहसील|taluka)[\s:]+([^\n]+)/i);
    if (talukaMatch) {
      parsed.taluka = talukaMatch[1].trim();
    }

    // Extract district (usually after "जिल्हा" or "जिला")
    const districtMatch = message.match(/(?:जिल्हा|जिला|district)[\s:]+([^\n]+)/i);
    if (districtMatch) {
      parsed.district = districtMatch[1].trim();
    }

    // Extract plant and subtype
    // Pattern: "Plant Name Quantity रोपे (Subtype)" or "Plant Name (Subtype) Quantity रोपे"
    const plantPatterns = [
      /([^\s]+)\s+(\d+)\s*रोपे?\s*\(([^)]+)\)/i, // टरबूज 12000 रोपे(सिंघम)
      /([^\s]+)\s*\(([^)]+)\)\s+(\d+)\s*रोपे?/i, // टरबूज(सिंघम) 12000 रोपे
      /([^\s]+)\s+(\d+)\s*रोपे?/i, // टरबूज 12000 रोपे
      /([^\s]+)\s*\(([^)]+)\)\s+(\d+)/i, // टरबूज(सिंघम) 12000
      /([^\s]+)\s+(\d+)/i, // टरबूज 12000
    ];

    for (const pattern of plantPatterns) {
      const match = message.match(pattern);
      if (match) {
        const plantName = match[1].trim();
        parsed.plant = PLANT_MAPPINGS[plantName] || plantName;
        
        // Handle different match groups
        if (match[3] && match[2]) {
          // Check if match[3] is a number (quantity) or text (subtype)
          if (/^\d+$/.test(match[3])) {
            // match[2] is subtype, match[3] is quantity
            parsed.subtype = match[2].trim();
            parsed.quantity = parseInt(match[3]) || null;
          } else {
            // match[2] is quantity, match[3] is subtype
            parsed.quantity = parseInt(match[2]) || null;
            parsed.subtype = match[3].trim();
          }
        } else if (match[2]) {
          // Only quantity found
          if (/^\d+$/.test(match[2])) {
            parsed.quantity = parseInt(match[2]) || null;
          } else {
            parsed.subtype = match[2].trim();
          }
        }
        break;
      }
    }

    // Extract rate (usually "भाव" or "rate" followed by number)
    const rateMatch = message.match(/(?:भाव|rate|किंमत|price)[\s:]*(\d+(?:\.\d+)?)/i);
    if (rateMatch) {
      parsed.rate = parseFloat(rateMatch[1]);
    }

    // Extract delivery date (usually "डिलिवरी" or "तारीख" followed by date)
    const datePatterns = [
      /(?:डिलिवरी|delivery|तारीख|date)[\s:]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /(\d{2}[/-]\d{2}[/-]\d{2,4})/g,
    ];

    for (const pattern of datePatterns) {
      const matches = message.match(pattern);
      if (matches) {
        // Try to find the date that looks like delivery date
        for (const match of matches) {
          const dateStr = match.replace(/[^\d/-]/g, '');
          if (dateStr) {
            parsed.deliveryDate = dateStr;
            break;
          }
        }
        if (parsed.deliveryDate) break;
      }
    }

    // Extract payment info
    if (message.match(/advance|पेमेंट|payment/i)) {
      const paymentMatch = message.match(/(?:advance|पेमेंट|payment)[\s:]*([^\n]+)/i);
      if (paymentMatch) {
        parsed.paymentInfo = paymentMatch[1].trim();
      }
    }

    // Extract UTR ID
    const utrMatch = message.match(/(?:UTR|यूटीआर)[\s:]*([A-Z0-9]+)/i);
    if (utrMatch) {
      parsed.utrId = utrMatch[1].trim();
    }

    // Validate required fields
    if (!parsed.mobileNumber) {
      return { error: 'Mobile number not found in message' };
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing WhatsApp message:', error);
    return { error: 'Error parsing message: ' + error.message };
  }
};

/**
 * Format delivery date from DD/MM/YY to a more standard format
 * @param {string} dateStr - Date string like "04/01/26"
 * @returns {string} Formatted date string
 */
export const formatDeliveryDate = (dateStr) => {
  if (!dateStr) return null;

  try {
    const parts = dateStr.split(/[/-]/);
    if (parts.length === 3) {
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];

      // Handle 2-digit year (assuming 2000s)
      if (year.length === 2) {
        year = '20' + year;
      }

      // Return in DD-MM-YYYY format
      return `${day}-${month}-${year}`;
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }

  return dateStr;
};

export default parseWhatsAppMessage;

