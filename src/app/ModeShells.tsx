import { AppShell } from "../components/layout/AppShell";
import { useUnlockedAchievements } from "../database/usePracticeData";
import { ChildAchievements } from "../features/child/ChildAchievements";
import { ChildHome } from "../features/child/ChildHome";
import { ParentSummary } from "../features/parent/ParentSummary";
import { MultiplicationMap } from "../features/multiplication/MultiplicationMap";
import { Settings } from "../features/settings/Settings";
import { Achievements } from "../features/statistics/Achievements";
import { ParentAnalytics } from "../features/parent/ParentAnalytics";
import { ParentDiagnosis } from "../features/parent/ParentDiagnosis";
import { ParentHistory } from "../features/parent/ParentHistory";
import { ParentWeakSpots } from "../features/parent/ParentWeakSpots";
import { ParentReadStatus } from "../features/parent/ParentReadStatus";
import { Training } from "../features/training/Training";
import type { AppMode, Route } from "./router";

interface ModeShellProps {
  screen: Route;
  targetPair?: string;
  onSwitchMode: () => void;
}

function AchievementsPage() {
  const { state, error } = useUnlockedAchievements();
  return state ? <Achievements rewards={state} /> : <ParentReadStatus error={error} />;
}

function practice(mode: AppMode, screen: "training" | "weak" | "diagnostic", targetPair?: string, covered = false) {
  return (
    <Training key={`${screen}:${targetPair ?? ""}`}
      mode={screen === "training" ? "adaptive" : screen}
      targetPair={targetPair} covered={covered} appMode={mode} />
  );
}

export function ChildShell({ covered, ...props }: ModeShellProps & { covered: boolean }) {
  const { screen, targetPair } = props;
  const content = screen === "achievements" ? <ChildAchievements /> :
    screen === "training" || screen === "weak" ? practice("child", screen, targetPair, covered) :
      <ChildHome />;
  return <AppShell mode="child" {...props}>{content}</AppShell>;
}

export function ParentShell(props: ModeShellProps) {
  const { screen, targetPair } = props;
  let content;
  switch (screen) {
    case "training":
    case "weak":
    case "diagnostic":
      content = practice("parent", screen, targetPair);
      break;
    case "results":
      content = <ParentAnalytics />;
      break;
    case "diagnosis":
      content = <ParentDiagnosis />;
      break;
    case "weak-spots":
      content = <ParentWeakSpots />;
      break;
    case "history":
      content = <ParentHistory />;
      break;
    case "map":
      content = <MultiplicationMap />;
      break;
    case "settings":
      content = <Settings />;
      break;
    case "achievements":
      content = <AchievementsPage />;
      break;
    default:
      content = <ParentSummary />;
  }
  return <AppShell mode="parent" {...props}>{content}</AppShell>;
}
