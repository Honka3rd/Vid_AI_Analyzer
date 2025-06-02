import { Strategy } from "./services/strategy"

chrome.runtime.onMessage.addListener((message, _sender, send) => {
    Strategy.singleton().setSender(send).accept(message);
})