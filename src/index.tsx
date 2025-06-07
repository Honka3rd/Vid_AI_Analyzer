import { FC } from "react";
import Popup from "./ui/popup";
import { useCurrentTab } from "./hooks/useCurrentTabUrl";
// import { useActiveStrategyController } from "./controller/useActiveStrategyController";

export const Entry: FC = () => {
  const tab = useCurrentTab();
  // useActiveStrategyController(tab);
  return <Popup tab={tab} />;
};
