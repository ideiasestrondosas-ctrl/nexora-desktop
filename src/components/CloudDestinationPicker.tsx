import { useCloudStore, PROVIDER_LABELS } from '@/store/cloud';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CloudDestinationPicker({ selectedIds, onChange }: Props) {
  const { profiles } = useCloudStore();

  if (profiles.length === 0) return null;

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="mt-3">
      <p className="text-xs text-text-muted mb-2">Destinos cloud (opcional)</p>
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => {
          const selected = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`flex items-center gap-1.5 text-xs rounded px-2.5 py-1.5 border transition-colors ${
                selected
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-bg-secondary border-border text-text-muted hover:border-border-hover'
              }`}
            >
              <span>{p.name}</span>
              <span className="text-text-muted text-[10px]">({PROVIDER_LABELS[p.provider]})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
