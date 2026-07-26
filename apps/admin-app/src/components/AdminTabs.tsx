import { Boxes, ReceiptText, Users } from "lucide-react";
import { Button } from "@grocery/ui";
import type { AdminTab } from "../App";

const TABS: Array<{ tab: AdminTab; label: string; icon: typeof Boxes }> = [
  { tab: "inventory", label: "Inventory", icon: Boxes },
  { tab: "customers", label: "Customers", icon: Users },
  { tab: "orders", label: "Order history", icon: ReceiptText }
];

export function AdminTabs({ activeTab, onNavigate }: { activeTab: AdminTab; onNavigate: (tab: AdminTab) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {TABS.map(({ tab, label, icon: Icon }) => (
        <Button
          key={tab}
          type="button"
          variant={activeTab === tab ? "primary" : "secondary"}
          onClick={() => onNavigate(tab)}
        >
          <Icon aria-hidden size={18} />
          {label}
        </Button>
      ))}
    </div>
  );
}
