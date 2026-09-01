import { useSearchParams } from "react-router-dom";
import MediaHistoryCore from "./MediaHistoryCore";
import SmartPricing from "./SmartPricing";

export default function MediaHistory() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");

  if (view === "smart-pricing") {
    return <SmartPricing />;
  }

  return <MediaHistoryCore />;
}
