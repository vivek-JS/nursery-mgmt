import React, { useMemo } from "react"
import { Joyride, STATUS } from "react-joyride"
import { buildMisJoyrideSteps } from "./misGuide"

const joyrideStyles = {
  options: {
    primaryColor: "#2e7d32",
    zIndex: 10050,
  },
  tooltip: {
    borderRadius: "12px",
    maxWidth: "380px",
  },
  tooltipTitle: {
    fontSize: "14px",
    fontWeight: 700,
  },
  tooltipContent: {
    fontSize: "13px",
    padding: "8px 0 4px",
  },
  buttonNext: {
    borderRadius: "8px",
    fontSize: "13px",
  },
  buttonBack: {
    fontSize: "13px",
  },
  buttonSkip: {
    fontSize: "12px",
    color: "#9ca3af",
  },
}

const joyrideLocale = {
  back: "Back",
  close: "Close",
  last: "Done",
  next: "Next",
  skip: "Skip",
}

export default function MisGuideJoyride({ run, tourKey, activeTab, onFinish }) {
  const steps = useMemo(() => buildMisJoyrideSteps(activeTab), [activeTab, tourKey])

  return (
    <Joyride
      key={tourKey}
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableScrolling={false}
      floaterProps={{ disableAnimation: false }}
      callback={({ status }) => {
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
          onFinish?.()
        }
      }}
      styles={joyrideStyles}
      locale={joyrideLocale}
    />
  )
}
