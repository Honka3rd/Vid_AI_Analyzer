import { Nullable } from "../types/nullable";

export type PopupProps = {
  tab: Nullable<chrome.tabs.Tab>;
};
export default function Popup(props: PopupProps) {
  return (
    <div>
      <p>{props.tab?.url}</p>
    </div>
  );
}
