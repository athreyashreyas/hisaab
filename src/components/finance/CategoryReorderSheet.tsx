import { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { BottomSheet } from '../ui/BottomSheet';
import { Icon } from '../ui/Icon';
import { formatINR } from '../../lib/calculations';
import type { Category } from '../../types';

function GripIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
      {[3, 9, 15].map((y) => [3, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}
    </svg>
  );
}

/**
 * One draggable row. The drag is started by the grip alone (dragListener is
 * off) so a scroll gesture anywhere else in the sheet still scrolls the list.
 */
function Row({ category }: { category: Category }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={controls}
      dragElastic={0}
      dragMomentum={false}
      whileDrag={{ scale: 1.03, boxShadow: '0 10px 26px rgba(35, 25, 15, 0.18)', zIndex: 1 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="flex select-none items-center gap-3 rounded-card bg-parchment-100 px-3 py-2.5"
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        aria-label={`Reorder ${category.name}`}
        style={{ touchAction: 'none' }}
        className="-m-1.5 shrink-0 cursor-grab touch-none p-1.5 text-ink-300 active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
        style={{ backgroundColor: `${category.color}22`, color: category.color }}
      >
        <Icon name={category.icon} size={16} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink-900">{category.name}</span>
      {category.monthly_budget ? (
        <span className="shrink-0 text-[12px] tabular-nums text-ink-500">{formatINR(category.monthly_budget)}/mo</span>
      ) : null}
    </Reorder.Item>
  );
}

/**
 * Drag categories into the order they should appear in. The order set here is
 * the one used everywhere categories are listed — the add-expense picker, the
 * budgets list, charts — because every read goes through useCategories(), which
 * sorts on `order`.
 *
 * Each drop is saved immediately; there is nothing to confirm. The local list
 * is seeded from props on open and then owned by the drag, so the live query
 * updating underneath us mid-gesture can't yank a row out from under the
 * pointer.
 */
export function CategoryReorderSheet({
  open,
  categories,
  onClose,
  onReorder,
}: {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onReorder: (next: Category[]) => void;
}) {
  const [ordered, setOrdered] = useState<Category[]>(categories);

  useEffect(() => {
    if (open) setOrdered(categories);
    // Only reseed on open: re-syncing while the sheet is up would fight the drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Reorder categories">
      <div className="px-5 pt-2">
        <p className="pb-3 text-[12px] text-ink-500">
          Drag to set the order categories appear in, here and when adding an expense.
        </p>
        <Reorder.Group
          axis="y"
          values={ordered}
          onReorder={(next) => {
            setOrdered(next);
            onReorder(next);
          }}
          className="space-y-2 pb-4"
        >
          {ordered.map((category) => (
            <Row key={category.id} category={category} />
          ))}
        </Reorder.Group>
      </div>
    </BottomSheet>
  );
}
