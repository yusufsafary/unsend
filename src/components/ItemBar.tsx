import { ITEMS, ITEM_RARITY_COLOR } from '../lib/adventure';

interface ItemBarProps {
  inventory: string[];
  activeEffects: string[];
  onToggleItem: (itemId: string) => void;
}

export function ItemBar({ inventory, activeEffects, onToggleItem }: ItemBarProps) {
  const slots = [0, 1, 2];

  return (
    <div>
      <style>{`
        @keyframes itemGlow { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 8px currentColor} }
      `}</style>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.35em]" style={{ color: '#3a3020' }}>
          — inventory
        </span>
        <span className="font-mono text-[8px]" style={{ color: '#2a2820' }}>
          {inventory.length}/3 slots
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map(i => {
          const itemId = inventory[i];
          const item = itemId ? ITEMS[itemId] : null;
          const isActive = item ? activeEffects.includes(item.effect) : false;
          const rarityColor = item ? ITEM_RARITY_COLOR[item.rarity] : '#1e1a15';

          return (
            <button
              key={i}
              onClick={() => item && onToggleItem(itemId)}
              disabled={!item}
              style={{
                border: isActive ? `1px solid ${rarityColor}` : '1px solid #1e1a15',
                background: isActive ? `${rarityColor}12` : '#100c08',
                cursor: item ? 'pointer' : 'default',
                padding: '8px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                position: 'relative',
                transition: 'all 0.2s',
                minHeight: 64,
                justifyContent: 'center',
              }}
            >
              {item ? (
                <>
                  <span style={{ fontSize: 16, color: rarityColor, lineHeight: 1 }}>{item.icon}</span>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-center leading-tight"
                    style={{ color: isActive ? rarityColor : '#5C5547' }}>
                    {item.name}
                  </span>
                  {isActive && (
                    <span className="font-mono text-[7px] uppercase tracking-widest"
                      style={{ color: rarityColor }}>
                      active
                    </span>
                  )}
                </>
              ) : (
                <span className="font-mono text-[8px]" style={{ color: '#1e1a15' }}>empty</span>
              )}
            </button>
          );
        })}
      </div>
      {inventory.length === 0 && (
        <p className="font-mono text-[9px] italic mt-1" style={{ color: '#2a2420' }}>
          defeat bosses and complete quests to earn items
        </p>
      )}
    </div>
  );
}
