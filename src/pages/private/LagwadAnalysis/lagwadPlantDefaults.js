import {
  findDefaultBananaPlant,
  findDefaultBananaSubtype,
  isBananaPlantName,
} from "../plantPipeline/utils/lagwadWizardHelpers"

/** Lab-sowing crops stay on the sowing screens. Lagwad analysis is the rest. */
export function lagwadDropdownPlants(plants) {
  return (plants || []).filter((p) => !p.sowingAllowed)
}

export function pickLagwadPlantId(plants, currentId) {
  const list = lagwadDropdownPlants(plants)
  if (currentId && list.some((p) => String(p.plantId) === String(currentId))) {
    return String(currentId)
  }
  const banana = findDefaultBananaPlant(list)
  if (banana?.plantId) return String(banana.plantId)
  return list[0]?.plantId ? String(list[0].plantId) : ""
}

export function pickLagwadSubtypeId(subtypes, currentId, plantName) {
  const list = subtypes || []
  if (currentId && list.some((s) => String(s.subtypeId) === String(currentId))) {
    return String(currentId)
  }
  if (isBananaPlantName(plantName)) {
    const named = list.map((s) => ({ ...s, name: s.subtypeName || s.name }))
    const g9 = findDefaultBananaSubtype(named)
    if (g9?.subtypeId) return String(g9.subtypeId)
  }
  return list[0]?.subtypeId ? String(list[0].subtypeId) : ""
}
