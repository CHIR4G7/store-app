import { Button } from "@grocery/ui";
import type { Category } from "@grocery/products";

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelect
}: {
  categories: Category[];
  selectedCategory: string;
  onSelect: (categoryId: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product categories">
      <Button variant={selectedCategory === "" ? "primary" : "secondary"} onClick={() => onSelect("")} className="shrink-0">
        All
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "primary" : "secondary"}
          onClick={() => onSelect(category.id)}
          className="shrink-0"
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}
