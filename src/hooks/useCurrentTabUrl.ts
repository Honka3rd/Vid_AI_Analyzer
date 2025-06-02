import { useEffect, useState } from "react";
import { Nullable } from "../types/nullable";

export const useCurrentTab = () => {
  const [tab, setTab] = useState<Nullable<chrome.tabs.Tab>>(null);

  // Initial fetch
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const current = tabs[0];
      if (current?.url) setTab(current);
    });
  }, []);

  useEffect(() => {
    const handleTabUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (tab.active && changeInfo.status === "complete" && tab.url) {
        setTab(tab);
      }
    };

    const handleTabActivated = ({ tabId }: chrome.tabs.TabActiveInfo) => {
      chrome.tabs.get(tabId, (tab) => {
        if (tab?.url) setTab(tab);
      });
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, []);

  return tab;
};
