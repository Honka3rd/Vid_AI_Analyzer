import { isEmpty, isNull } from "lodash";
import { useEffect } from "react";
import { Nullable } from "../types/nullable";
import { Actions } from "../shared/actions";

export const useActiveStrategyController = (tab: Nullable<chrome.tabs.Tab>) => {
  useEffect(() => {
    if (isNull(tab)) {
      return;
    }
    const id = tab.id;
    if(isEmpty(id)) {
      return;
    }
    chrome.tabs.sendMessage(id!, { type: Actions.GET_TRANSCRIPT, url: tab.url }, (response) => {
      console.log("Transcript response:", response);
    });
  }, [tab]);
};
