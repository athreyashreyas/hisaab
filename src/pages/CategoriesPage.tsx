import { useState, useEffect } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { formatINR } from '../lib/calculations';
import { useCategories } from '../hooks/useData';
import { createCategory, updateCategory, restoreDefaultCategories } from '../lib/repo';
import { CATEGORY_PALETTE } from '../lib/categories';
import type { Category } from '../types';
import { cn } from '../lib/cn';

const ICON_CHOICES = [
  'utensils', 'shopping-basket', 'bus', 'receipt', 'shopping-bag', 'heart-pulse',
  'clapperboard', 'plane', 'repeat', 'gift', 'home', 'coffee', 'dumbbell',
  'graduation-cap', 'baby', 'paw-print', 'circle-dashed',
];

/** Manage categories: rename, recolour, set monthly budgets, restore defaults. */
export function CategoriesPage() {
  const categories = useCategories();
  const [editing, setEditing] = useState<Category | null | 'new'>(null);

  return (
    <div>
      <PageHeader
        kicker="Buckets & budgets"
        title="Categories"
        back
        trailing={
          <Button size="sm" onClick={() => setEditing('new')} className="px-3">
            <Plus size={16} /> Add
          </Button>
        }
      />

      <Card className="mt-3 divide-y divide-parchment-200 overflow-hidden">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setEditing(c)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-parchment-100"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
              <Icon name={c.icon} size={17} />
            </span>
            <span className="flex-1 truncate text-[14px] font-semibold text-ink-900">{c.name}</span>
            {c.monthly_budget ? (
              <span className="text-[12.5px] tabular-nums text-ink-500">{formatINR(c.monthly_budget)}/mo</span>
            ) : (
              <span className="text-[12px] text-ink-300">No budget</span>
            )}
          </button>
        ))}
      </Card>

      <Button variant="ghost" onClick={() => restoreDefaultCategories()} className="mt-4 text-ink-500">
        <RotateCcw size={16} /> Restore default categories
      </Button>

      <CategoryModal target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CategoryModal({ target, onClose }: { target: Category | null | 'new'; onClose: () => void }) {
  const open = target !== null;
  const existing = target !== 'new' && target !== null ? target : null;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('circle-dashed');
  const [color, setColor] = useState(CATEGORY_PALETTE.grey);
  const [budget, setBudget] = useState('');

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setIcon(existing.icon);
      setColor(existing.color);
      setBudget(existing.monthly_budget ? String(Math.round(existing.monthly_budget / 100)) : '');
    } else {
      setName('');
      setIcon('circle-dashed');
      setColor(CATEGORY_PALETTE.grey);
      setBudget('');
    }
  }, [open, existing]);

  const canSave = name.trim().length > 0;

  async function save() {
    if (!canSave) return;
    const monthly_budget = budget ? Math.round(Number(budget) * 100) : null;
    if (existing) await updateCategory(existing.id, { name: name.trim(), icon, color, monthly_budget });
    else await createCategory({ name: name.trim(), icon, color, monthly_budget });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit category' : 'New category'}>
      <div className="space-y-4 px-5 py-4">
        <Input label="Name" placeholder="Food & dining" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Monthly budget"
          inputMode="numeric"
          placeholder="Optional"
          value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))}
          hint="Leave blank to leave this category untracked."
        />

        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Colour</div>
          <div className="flex flex-wrap gap-2">
            {Object.values(CATEGORY_PALETTE).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn('h-8 w-8 rounded-full', color === c && 'ring-2 ring-offset-2 ring-offset-parchment-100')}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Icon</div>
          <div className="grid grid-cols-8 gap-1.5">
            {ICON_CHOICES.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={cn(
                  'grid h-9 place-items-center rounded-card border',
                  icon === ic ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-parchment-300 text-ink-500'
                )}
                aria-label={ic}
              >
                <Icon name={ic} size={16} />
              </button>
            ))}
          </div>
        </div>

        <Button onClick={save} disabled={!canSave} block className="mt-1">
          {existing ? 'Save changes' : 'Add category'}
        </Button>
      </div>
    </Modal>
  );
}
