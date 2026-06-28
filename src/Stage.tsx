import {ReactElement, useState} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

type BodyPart = {
  name: string;
  equipped: string | null;
  baseStat: number;
  currentStat: number;
  slot: 'head' | 'neck' | 'rightArm' | 'leftArm' | 'torso' | 'crotch' | 'leftLeg' | 'rightLeg' | 'tail' | 'wings';
  isCursed: boolean;
  description: string;
  statBonus: number;
};

type Equipment = {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
  weaponStat: number;
  armorStat: number;
  accessoryStat: number;
};

type ShopItem = {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  statBonus: number;
  price: number;
  description: string;
  isClownThemed: boolean;
};

type MessageStateType = {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  gold: number;
  level: number;
  exp: number;
  expToNext: number;
  bodyParts: BodyPart[];
  equipment: Equipment;
  inventory: string[];
  stats: {
    strength: number;
    defense: number;
  };
  cursedRemoved: boolean;
  owner: {
    name: string;
    mood: string;
    relationship: string;
    description: string;
  };
};

type ConfigType = {
  startingGold: number;
  startingHealth: number;
  startingStamina: number;
};

type InitStateType = any;
type ChatStateType = any;

// ============================================
// UI COMPONENT - All hooks live here
// ============================================

function ZombieUI({ stage }: { stage: Stage }) {
  const [activeTab, setActiveTab] = useState<'body' | 'equipment' | 'shop' | 'owner'>('body');
  const [showInventory, setShowInventory] = useState(false);
  const [message, setMessage] = useState('');
  const [, forceUpdate] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<{ text: string; x: number; y: number } | null>(null);

  const state = stage.myInternalState;

  const updateUI = () => {
    stage.setState(stage.myInternalState as MessageStateType);
    forceUpdate(prev => prev + 1);
  };

  const handleUseHealthPotion = () => {
    const result = stage.useHealthPotion();
    setMessage(result.message);
    updateUI();
  };

  const handleUseStaminaPotion = () => {
    const result = stage.useStaminaPotion();
    setMessage(result.message);
    updateUI();
  };

  const handleRefreshShop = () => {
    if (stage.myInternalState.gold < 10) {
      setMessage('Not enough gold! Need 10 gold to refresh.');
      return;
    }
    stage.addGold(-10);
    stage.generateShopItems();
    setMessage('Shop refreshed! New clownish items available.');
    updateUI();
  };

  const handleBuyItem = (item: ShopItem) => {
    if (stage.myInternalState.gold < item.price) {
      setMessage(`Not enough gold! Need ${item.price} gold.`);
      return;
    }
    stage.addItem(item.name);
    stage.addGold(-item.price);
    setMessage(`Purchased ${item.name}!`);
    updateUI();
  };

  const handleEquipFromInventory = (itemName: string) => {
    const lowerName = itemName.toLowerCase();
    const bodyPartTypes = ['human head', 'bat wings', 'tail', 'right arm', 'left arm', 'torso', 'neck', 'head', 'leg'];
    if (bodyPartTypes.some((part: string) => lowerName.includes(part))) {
      let slot: string = '';
      if (lowerName.includes('human head') || lowerName.includes('head')) slot = 'head';
      else if (lowerName.includes('neck')) slot = 'neck';
      else if (lowerName.includes('right arm')) slot = 'rightArm';
      else if (lowerName.includes('left arm')) slot = 'leftArm';
      else if (lowerName.includes('torso')) slot = 'torso';
      else if (lowerName.includes('crotch')) slot = 'crotch';
      else if (lowerName.includes('left leg')) slot = 'leftLeg';
      else if (lowerName.includes('right leg')) slot = 'rightLeg';
      else if (lowerName.includes('tail')) slot = 'tail';
      else if (lowerName.includes('wings') || lowerName.includes('bat wings')) slot = 'wings';
      if (slot) {
        const result = stage.equipBodyPartFromInventory(slot, itemName);
        setMessage(result.message);
        updateUI();
        return;
      }
    }
    const weaponKeywords = ['sword', 'axe', 'mace', 'staff', 'dagger', 'spear', 'bow', 'claw', 'whip', 'flail', 'hammer', 'club', 'cannon', 'chicken'];
    let success = false;
    if (weaponKeywords.some((kw: string) => lowerName.includes(kw))) {
      success = stage.equipWeapon(itemName);
      if (success) setMessage(`Equipped ${itemName} as weapon! (+${stage.itemStats[itemName] || 2} strength)`);
    } else if (lowerName.includes('plate') || lowerName.includes('chainmail') || lowerName.includes('leather') ||
      lowerName.includes('scale') || lowerName.includes('cloth') || lowerName.includes('bone') ||
      lowerName.includes('silk') || lowerName.includes('studded') || lowerName.includes('hide') ||
      lowerName.includes('bronze') || lowerName.includes('robe') || lowerName.includes('suit') ||
      lowerName.includes('vest') || lowerName.includes('coat') || lowerName.includes('shirt') ||
      lowerName.includes('armor') || lowerName.includes('skin')) {
      success = stage.equipArmor(itemName);
      if (success) setMessage(`Equipped ${itemName} as armor! (+${stage.itemStats[itemName] || 2} defense)`);
    } else {
      success = stage.equipAccessory(itemName);
      if (success) setMessage(`Equipped ${itemName} as accessory! (+${stage.itemStats[itemName] || 2} all stats)`);
    }
    if (!success) setMessage(`Could not equip ${itemName}.`);
    updateUI();
  };

  const handleRemoveBodyPart = (slot: string) => {
    const result = stage.removeBodyPart(slot);
    setMessage(result.message);
    updateUI();
  };

  const handleSellItem = (itemName: string) => {
    const result = stage.sellItem(itemName);
    setMessage(result.message);
    updateUI();
  };

  const handleMouseEnter = (text: string, e: React.MouseEvent) => {
    setHoverInfo({ text, x: e.clientX + 10, y: e.clientY + 10 });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  const getItemDescription = (itemName: string): string => {
    const lowerName = itemName.toLowerCase();
    const statBonus = stage.itemStats[itemName] || 0;
    if (lowerName.includes('human head')) return `A standard human head. Good for thinking and looking normal. (+${statBonus || 2} stats)`;
    if (lowerName.includes('bat wings')) return `Leathery bat wings. Allows for limited flight and looks imposing. (+${statBonus || 3} stats)`;
    if (lowerName.includes('tail')) return `A prehensile tail. Useful for balance and grabbing things. (+${statBonus || 2} stats)`;
    if (lowerName.includes('cursed rotten right arm')) return `⚠️ CURSED ⚠️ This arm pulses with dark energy. Grants +${statBonus} stats but cannot be removed until the curse is lifted.`;
    if (lowerName.includes('squeaky') || lowerName.includes('honking')) return `A clownish weapon that makes comical noises while dealing damage. (+${statBonus || 2} strength)`;
    if (lowerName.includes('clown') || lowerName.includes('jester') || lowerName.includes('harlequin')) return `Clown-themed equipment. Colorful, gaudy, and surprisingly effective. (+${statBonus || 2} defense)`;
    if (lowerName.includes('red nose') || lowerName.includes('jester hat')) return `A clown accessory. Adds a touch of madness to your appearance. (+${statBonus || 2} all stats)`;
    return `A clown/circus themed item. (+${statBonus || 0} stats)`;
  };

  const renderBodySlot = (part: BodyPart) => (
    <div
      key={part.slot}
      style={{
        background: part.equipped && part.isCursed ? '#2a0a0a' : '#1a1a1a',
        padding: '8px 15px',
        borderRadius: '5px',
        border: part.equipped ? (part.isCursed ? '2px solid #ff0000' : '1px solid #6bcbff') : '1px solid #333333',
        textAlign: 'center',
        cursor: part.equipped ? 'pointer' : 'default'
      }}
      onMouseEnter={(e) => part.equipped && handleMouseEnter(
        `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`, e
      )}
      onMouseLeave={handleMouseLeave}
      onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
    >
      <span style={{ fontWeight: 'bold' }}>{part.name}</span>
      <div style={{ fontSize: '11px', color: part.isCursed ? '#ff6b6b' : (part.equipped ? '#6bcbff' : '#666') }}>
        {part.equipped ? `${part.isCursed ? '⚠️' : '🟢'} ${part.equipped} (+${part.statBonus})${part.isCursed ? ' 🔒' : ''}` : 'Empty'}
      </div>
    </div>
  );

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      padding: '15px',
      paddingBottom: '30px',
      background: '#000000',
      color: '#ffffff',
      fontFamily: 'monospace',
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 9999
    }}>
      <style>{`
        html, body, #root { 
          background: #000000 !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          min-height: 100vh !important;
          overflow-y: auto !important;
        }
        button:hover { opacity: 0.8; }
        .hover-tooltip { 
          position: fixed; 
          background: #1a1a1a; 
          border: 1px solid #ffd93d; 
          padding: 8px 12px; 
          border-radius: 5px; 
          color: #ffffff; 
          font-size: 12px; 
          max-width: 300px; 
          z-index: 10000; 
          pointer-events: none; 
          box-shadow: 0 0 20px rgba(255,217,61,0.2); 
        }
      `}</style>

      {hoverInfo && (
        <div className="hover-tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>{hoverInfo.text}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h1 style={{ color: '#ff6b6b', margin: 0 }}>🧟 Zombie Mod</h1>
        <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#aaaaaa' }}>
          <span>⚔️ Lv.{state.level}</span>
          <span>❤️ {state.health}/{state.maxHealth}</span>
          <span>⚡ {state.stamina}/{state.maxStamina}</span>
          <span>💰 {state.gold}</span>
        </div>
      </div>

      {/* EXP Bar */}
      <div style={{ width: '100%', height: '20px', background: '#1a1a1a', borderRadius: '10px', marginBottom: '15px', border: '1px solid #333333', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${Math.min(100, (state.exp / state.expToNext) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #ff6b6b, #ffd93d)', transition: 'width 0.3s ease' }} />
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '2px', fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>
          EXP {state.exp}/{state.expToNext}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        {(['body', 'equipment', 'shop', 'owner'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', background: 'transparent',
            color: activeTab === tab ? '#ff6b6b' : '#888888', border: 'none',
            borderBottom: activeTab === tab ? '2px solid #ff6b6b' : '2px solid transparent',
            cursor: 'pointer', fontWeight: activeTab === tab ? 'bold' : 'normal',
            textTransform: 'uppercase', fontSize: '14px'
          }}>
            {tab === 'body' ? '🧬 Body Mods' : tab === 'equipment' ? '⚔️ Equipment' : tab === 'shop' ? '🏪 Shop' : '👤 Owner'}
          </button>
        ))}
      </div>

      {/* Body Tab */}
      {activeTab === 'body' && (
        <div style={{
          background: '#111111',
          padding: '15px',
          borderRadius: '10px',
          border: '1px solid #333333',
          marginBottom: '15px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#ffd93d' }}>
            🧬 Body Mods ({state.bodyParts.filter((p: BodyPart) => p.equipped).length}/10)
            {state.cursedRemoved && <span style={{ fontSize: '12px', color: '#6bcbff', marginLeft: '10px' }}>🔓 Curse removal unlocked!</span>}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '300px' }}>
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'head').map(renderBodySlot)}
            </div>
            <div style={{ width: '100%', maxWidth: '200px' }}>
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'neck').map(renderBodySlot)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '8px', width: '100%', maxWidth: '600px' }}>
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'rightArm').map(renderBodySlot)}
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'torso').map(renderBodySlot)}
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'leftArm').map(renderBodySlot)}
            </div>
            <div style={{ width: '100%', maxWidth: '300px' }}>
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'crotch').map(renderBodySlot)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '400px' }}>
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'leftLeg').map(renderBodySlot)}
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'rightLeg').map(renderBodySlot)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '400px' }}>
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'tail').map(renderBodySlot)}
              {state.bodyParts.filter((p: BodyPart) => p.slot === 'wings').map(renderBodySlot)}
            </div>
          </div>
          <div style={{ marginTop: '15px', padding: '10px', background: '#0a0a0a', borderRadius: '5px', border: '1px solid #333' }}>
            <div style={{ color: '#888', fontSize: '12px' }}>💡 Click on equipped body parts to remove them (except cursed ones).</div>
          </div>
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div style={{ background: '#111111', padding: '15px', borderRadius: '10px', border: '1px solid #333333', marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#ffd93d' }}>⚔️ Equipment <span style={{ fontSize: '12px', color: '#ff8a5c' }}>(Clown/Circus Themed)</span></h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { label: '🤡 Weapon', item: state.equipment.weapon, stat: state.equipment.weaponStat, statLabel: 'STR' },
              { label: '🎪 Armor', item: state.equipment.armor, stat: state.equipment.armorStat, statLabel: 'DEF' },
              { label: '🎭 Accessory', item: state.equipment.accessory, stat: state.equipment.accessoryStat, statLabel: 'ALL' },
            ].map(({ label, item, stat, statLabel }) => (
              <div key={label} style={{ background: '#1a1a1a', padding: '10px', borderRadius: '5px' }}
                onMouseEnter={(e) => handleMouseEnter(`${label}: ${item || 'None'} (+${stat || 0}) - ${item ? getItemDescription(item) : 'None equipped'}`, e)}
                onMouseLeave={handleMouseLeave}>
                <div style={{ color: '#aaaaaa' }}>{label}</div>
                <div style={{ fontWeight: 'bold', color: '#ffffff' }}>
                  {item || 'None'} <span style={{ fontSize: '12px', color: '#ffd93d' }}>(+{stat || 0} {statLabel})</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#1a1a1a', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
              <div style={{ color: '#ff8a5c' }}>💪 Strength & Flexibility</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>{state.stats.strength}</div>
            </div>
            <div style={{ background: '#1a1a1a', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
              <div style={{ color: '#6bcbff' }}>🛡️ Defense</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>{state.stats.defense}</div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Tab */}
      {activeTab === 'shop' && (
        <div style={{ background: '#111111', padding: '15px', borderRadius: '10px', border: '1px solid #333333', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#ffd93d' }}>🏪 Clown Equipment Shop (Level {state.level})</h3>
            <button onClick={handleRefreshShop} style={{ background: '#ffd93d', color: '#ffffff', border: 'none', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              🔄 Refresh (10g)
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
            {stage.shopItems.map((item: ShopItem) => (
              <div key={item.id} style={{ background: '#1a1a1a', padding: '10px', borderRadius: '5px', border: '1px solid #333333' }}
                onMouseEnter={(e) => handleMouseEnter(`${item.name}: ${item.description}`, e)}
                onMouseLeave={handleMouseLeave}>
                <div style={{ fontWeight: 'bold', color: '#ffffff' }}>🤡 {item.name}</div>
                <div style={{ fontSize: '12px', color: '#aaaaaa' }}>{item.description}</div>
                <div style={{ fontSize: '12px', color: '#ffd93d' }}>💰 {item.price} gold</div>
                <button onClick={() => handleBuyItem(item)} style={{ marginTop: '5px', background: '#6bcbff', color: '#ffffff', border: 'none', padding: '3px 10px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>Buy</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owner Tab */}
      {activeTab === 'owner' && (
        <div style={{ background: '#111111', padding: '15px', borderRadius: '10px', border: '1px solid #333333', marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#ffd93d' }}>👤 Current Owner</h3>
          <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333333' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <div style={{ color: '#aaaaaa', fontSize: '12px' }}>👤 Name</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>{state.owner.name || 'Unknown'}</div>
              </div>
              <div>
                <div style={{ color: '#aaaaaa', fontSize: '12px' }}>😊 Mood</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffd93d' }}>{state.owner.mood || 'Neutral'}</div>
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ color: '#aaaaaa', fontSize: '12px' }}>💞 Relationship</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6bcbff' }}>{state.owner.relationship || 'Stranger'}</div>
            </div>
            <div>
              <div style={{ color: '#aaaaaa', fontSize: '12px' }}>📝 Description</div>
              <div style={{ fontSize: '14px', color: '#ffffff', background: '#0a0a0a', padding: '10px', borderRadius: '5px', marginTop: '5px' }}>
                {state.owner.description || 'No owner information available yet.'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => { stage.updateOwner('Mistress Luna', 'Playful', 'Dominant', 'A mysterious woman who found the zombie in the circus ruins.'); setMessage('Owner updated!'); updateUI(); }}
              style={{ background: '#6bcbff', color: '#ffffff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Set Example Owner
            </button>
            <button onClick={() => { stage.updateOwner('Unknown', 'Neutral', 'Stranger', 'No owner information available yet.'); setMessage('Owner reset!'); updateUI(); }}
              style={{ background: '#888888', color: '#ffffff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Reset Owner
            </button>
          </div>
        </div>
      )}

      {/* Inventory Toggle */}
      <button onClick={() => setShowInventory(!showInventory)} style={{ background: '#ff6b6b', color: '#ffffff', border: '1px solid #ff6b6b', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', marginBottom: '10px', width: '100%' }}>
        {showInventory ? '📦 Hide Inventory' : '📦 Show Inventory'} ({state.inventory.length})
      </button>

      {/* Inventory */}
      {showInventory && (
        <div style={{
          background: '#111111',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '15px',
          border: '1px solid #333333'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#ffd93d' }}>📦 Inventory</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {state.inventory.map((item: string, index: number) => {
              const isCursed = item.includes('Cursed');
              const isEquipped = state.equipment.weapon === item ||
                                state.equipment.armor === item ||
                                state.equipment.accessory === item;
              const statBonus = stage.itemStats[item] || 0;
              return (
                <div key={index} style={{
                  background: isCursed ? '#2a0a0a' : (isEquipped ? '#1a2a1a' : '#1a1a1a'),
                  padding: '8px 15px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: isCursed ? '2px solid #ff0000' : (isEquipped ? '1px solid #6bcbff' : '1px solid #333333')
                }}
                  onMouseEnter={(e) => handleMouseEnter(
                    `${isCursed ? '⚠️ CURSED ⚠️ ' : ''}${item}: ${getItemDescription(item)}${isEquipped ? ' (Equipped)' : ''}`,
                    e
                  )}
                  onMouseLeave={handleMouseLeave}>
                  <span style={{ color: isCursed ? '#ff6b6b' : (isEquipped ? '#6bcbff' : '#ffffff') }}>
                    {isCursed ? '⚠️ ' : ''}{item}
                    {isEquipped && <span style={{ fontSize: '10px', color: '#6bcbff' }}> ⚔️</span>}
                    {statBonus > 0 && <span style={{ fontSize: '10px', color: '#ffd93d' }}> (+{statBonus})</span>}
                  </span>
                  {item === 'Health Potion' && (
                    <button onClick={handleUseHealthPotion} style={{ background: '#ff6b6b', color: '#ffffff', border: 'none', borderRadius: '3px', cursor: 'pointer', padding: '2px 8px', fontWeight: 'bold' }}>Use</button>
                  )}
                  {item === 'Stamina Potion' && (
                    <button onClick={handleUseStaminaPotion} style={{ background: '#6bcbff', color: '#ffffff', border: 'none', borderRadius: '3px', cursor: 'pointer', padding: '2px 8px', fontWeight: 'bold' }}>Use</button>
                  )}
                  {!['Health Potion', 'Stamina Potion'].includes(item) && !isEquipped && (
                    <button onClick={() => handleEquipFromInventory(item)} style={{
                      background: isCursed ? '#ff6b6b' : '#ffd93d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      padding: '2px 8px',
                      fontWeight: 'bold'
                    }}>
                      {isCursed ? '⚠️ Equip' : 'Equip'}
                    </button>
                  )}
                  {/* Sell Button */}
                  {!['Health Potion', 'Stamina Potion'].includes(item) && !isEquipped && !isCursed && (
                    <button onClick={() => handleSellItem(item)} style={{
                      background: '#ff8a5c',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      padding: '2px 8px',
                      fontWeight: 'bold'
                    }}>
                      💰 Sell
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        {[
          { label: '💰 +10 Gold', color: '#ffd93d', action: () => { stage.addGold(10); setMessage('+10 Gold!'); updateUI(); } },
          { label: '⚔️ Take 10 Damage', color: '#ff6b6b', action: () => { const d = stage.takeDamage(10); setMessage(`Took ${Math.floor(d)} damage!`); updateUI(); } },
          { label: '🧪 Get Potion', color: '#6bcbff', action: () => { stage.addItem('Health Potion'); setMessage('+1 Health Potion!'); updateUI(); } },
          { label: '⭐ +15 EXP', color: '#c084fc', action: () => { stage.addExp(15); setMessage('+15 EXP!'); updateUI(); } },
          { label: '🔓 Unlock Cursed Removal', color: '#ff4444', action: () => { stage.unlockCursedRemoval(); setMessage('🔓 Cursed removal unlocked!'); updateUI(); } },
        ].map(({ label, color, action }) => (
          <button key={label} onClick={action} style={{ background: color, color: '#ffffff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>{label}</button>
        ))}
      </div>

      <div style={{ marginTop: '10px', padding: '10px', background: '#1a0a0a', borderRadius: '5px', border: '1px solid #661111', fontSize: '11px', color: '#884444', textAlign: 'center' }}>
        🔞 Adult-oriented zombie RPG - Contains mature themes 🤡 All equipment is clown/circus themed
      </div>

      {message && (
        <div style={{ background: '#1a1a1a', padding: '10px', borderRadius: '5px', marginTop: '10px', color: '#ffd93d', border: '1px solid #333333' }}>
          {message}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN STAGE CLASS
// ============================================

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

  myInternalState: MessageStateType & { [key: string]: any };
  shopItems: ShopItem[] = [];
  itemStats: { [key: string]: number } = {};

  constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
    super(data);
    const config = data.config || { startingGold: 50, startingHealth: 100, startingStamina: 50 };
    const bodyParts: BodyPart[] = [
      { name: '🧠 Head', equipped: null, baseStat: 2, currentStat: 2, slot: 'head', isCursed: false, description: 'Your skull.', statBonus: 0 },
      { name: '🦴 Neck', equipped: null, baseStat: 1, currentStat: 1, slot: 'neck', isCursed: false, description: 'Connects head to body.', statBonus: 0 },
      { name: '💪 Right Arm', equipped: null, baseStat: 3, currentStat: 3, slot: 'rightArm', isCursed: false, description: 'Your right arm.', statBonus: 0 },
      { name: '🛡️ Torso', equipped: null, baseStat: 5, currentStat: 5, slot: 'torso', isCursed: false, description: 'The main body.', statBonus: 0 },
      { name: '💪 Left Arm', equipped: null, baseStat: 3, currentStat: 3, slot: 'leftArm', isCursed: false, description: 'Your left arm.', statBonus: 0 },
      { name: '🔻 Crotch', equipped: null, baseStat: 1, currentStat: 1, slot: 'crotch', isCursed: false, description: 'The pelvic region.', statBonus: 0 },
      { name: '🦵 Left Leg', equipped: null, baseStat: 2, currentStat: 2, slot: 'leftLeg', isCursed: false, description: 'Your left leg.', statBonus: 0 },
      { name: '🦵 Right Leg', equipped: null, baseStat: 2, currentStat: 2, slot: 'rightLeg', isCursed: false, description: 'Your right leg.', statBonus: 0 },
      { name: '🦎 Tail', equipped: null, baseStat: 0, currentStat: 0, slot: 'tail', isCursed: false, description: 'A tail.', statBonus: 0 },
      { name: '🦅 Wings', equipped: null, baseStat: 0, currentStat: 0, slot: 'wings', isCursed: false, description: 'Wings.', statBonus: 0 },
    ];
    this.generateItemStats();
    this.myInternalState = {
      health: config.startingHealth || 100, maxHealth: config.startingHealth || 100,
      stamina: config.startingStamina || 50, maxStamina: config.startingStamina || 50,
      gold: config.startingGold || 50, level: 1, exp: 0, expToNext: 50,
      bodyParts,
      equipment: { weapon: 'Duo Dagger of Clownishness', armor: 'Harlequin shiny long cloak', accessory: 'Black half face mask', weaponStat: 4, armorStat: 3, accessoryStat: 2 },
      inventory: ['Health Potion', 'Stamina Potion', 'Human Head (Standard)', 'Bat Wings (Leathery)', 'Tail (Prehensile)', 'Cursed Rotten Right Arm (Cursed)', 'Clown Nose Dagger', 'Polka Dot Plate Armor'],
      stats: { strength: 10, defense: 7 },
      cursedRemoved: false,
      owner: { name: 'Unknown', mood: 'Neutral', relationship: 'Stranger', description: 'No owner information available yet.' }
    };
    this.assignEquipmentStats();
    this.recalculateStats();
    this.generateShopItems();
  }

  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    return {
      success: true,
      error: null,
      initState: null,
      chatState: null,
    };
  }

  async setState(state: MessageStateType): Promise<void> {
    if (state != null) this.myInternalState = { ...this.myInternalState, ...state } as MessageStateType & { [key: string]: any };
  }

  generateItemStats() {
    this.itemStats = {
      'Human Head (Standard)': 2, 'Bat Wings (Leathery)': 3, 'Tail (Prehensile)': 2,
      'Cursed Rotten Right Arm (Cursed)': 8, 'Duo Dagger of Clownishness': 4,
      'Clown Nose Dagger': 3, 'Harlequin shiny long cloak': 5,
      'Polka Dot Plate Armor': 4, 'Black half face mask': 2
    };
  }

  assignEquipmentStats() {
    const eq = this.myInternalState.equipment;
    eq.weaponStat = eq.weapon ? (this.itemStats[eq.weapon] || 2) : 0;
    eq.armorStat = eq.armor ? (this.itemStats[eq.armor] || 2) : 0;
    eq.accessoryStat = eq.accessory ? (this.itemStats[eq.accessory] || 2) : 0;
  }

  generateShopItems() {
    const level = this.myInternalState.level || 1;
    const statRange = Math.floor(level / 2) + 1;
    const basePrice = 10 + level * 2;
    const newItems: ShopItem[] = [];
    const weaponTypes = ['Squeaky Hammer', 'Juggling Club', 'Pie Thrower', 'Honking Sword', 'Balloon Blade', 'Circus Mace', 'Clown Car Cannon', 'Rubber Chicken Whip'];
    const armorTypes = ['Jester Robe', 'Clown Suit', 'Circus Tent Coat', 'Balloon Armor', 'Patchwork Vest', 'Polka Dot Plate', 'Ruffle Shirt', 'Harlequin Skin'];
    const accTypes = ['Red Nose', 'Jester Hat', 'Clown Shoes', 'Joy Buzzer', 'Rubber Chicken', 'Balloon Animal', 'Circus Ring', 'Confetti Pouch'];
    const wPrefixes = ['Squeaky', 'Colorful', 'Oversized', 'Bouncy', 'Jingly', 'Flamboyant', 'Sparkly'];
    const aPrefixes = ['Tattered', 'Oversized', 'Colorful', 'Patchy', 'Squeaky', 'Gaudy', 'Frayed'];
    const acPrefixes = ['Honking', 'Sparkling', 'Oversized', 'Jingly', 'Colorful', 'Squeaky'];
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const name = `${wPrefixes[Math.floor(Math.random() * wPrefixes.length)]} ${weaponTypes[Math.floor(Math.random() * weaponTypes.length)]}`;
      const statBonus = statRange + Math.floor(Math.random() * 2) + 1;
      this.itemStats[name] = statBonus;
      newItems.push({ id: `w_${Date.now()}_${i}`, name, type: 'weapon', statBonus, price: basePrice + 5 + Math.floor(Math.random() * 25), description: `A clownish weapon. (+${statBonus} strength)`, isClownThemed: true });
    }
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const name = `${aPrefixes[Math.floor(Math.random() * aPrefixes.length)]} ${armorTypes[Math.floor(Math.random() * armorTypes.length)]}`;
      const statBonus = statRange + Math.floor(Math.random() * 2) + 1;
      this.itemStats[name] = statBonus;
      newItems.push({ id: `a_${Date.now()}_${i}`, name, type: 'armor', statBonus, price: basePrice + 5 + Math.floor(Math.random() * 20), description: `Garish clown armor. (+${statBonus} defense)`, isClownThemed: true });
    }
    for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) {
      const name = `${acPrefixes[Math.floor(Math.random() * acPrefixes.length)]} ${accTypes[Math.floor(Math.random() * accTypes.length)]}`;
      const statBonus = statRange + 1;
      this.itemStats[name] = statBonus;
      newItems.push({ id: `ac_${Date.now()}_${i}`, name, type: 'accessory', statBonus, price: basePrice + 10 + Math.floor(Math.random() * 30), description: `A clownish accessory. (+${statBonus} all stats)`, isClownThemed: true });
    }
    this.shopItems = newItems;
  }

  getBodyPartTotalStat(): number {
    return this.myInternalState.bodyParts.reduce((t: number, p: BodyPart) => t + p.currentStat, 0);
  }

  equipBodyPartFromInventory(slot: string, itemName: string) {
    const parts = this.myInternalState.bodyParts;
    const partIndex = parts.findIndex((p: BodyPart) => p.slot === slot);
    if (partIndex === -1) return { success: false, message: 'Invalid body slot' };
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) return { success: false, message: 'Item not in inventory' };
    const isCursed = itemName.includes('Cursed');
    const statBonus = this.itemStats[itemName] || 2;
    if (parts[partIndex].equipped) this.myInternalState.inventory.push(parts[partIndex].equipped!);
    parts[partIndex].equipped = itemName;
    parts[partIndex].currentStat = statBonus;
    parts[partIndex].isCursed = isCursed;
    parts[partIndex].statBonus = statBonus;
    parts[partIndex].description = isCursed ? `A cursed part granting +${statBonus} stats.` : `An upgraded part granting +${statBonus} stats.`;
    this.myInternalState.inventory.splice(invIndex, 1);
    this.recalculateStats();
    return { success: true, message: `Equipped ${itemName} on ${parts[partIndex].name}!` };
  }

  removeBodyPart(slot: string) {
    const parts = this.myInternalState.bodyParts;
    const partIndex = parts.findIndex((p: BodyPart) => p.slot === slot);
    if (partIndex === -1) return { success: false, message: 'Invalid body slot' };
    const part = parts[partIndex];
    if (!part.equipped) return { success: false, message: 'No part equipped here' };
    if (part.isCursed && !this.myInternalState.cursedRemoved) return { success: false, message: 'This part is cursed! Complete a story event to remove it.' };
    const itemName = part.equipped;
    this.myInternalState.inventory.push(itemName);
    part.equipped = null; part.currentStat = part.baseStat; part.isCursed = false; part.statBonus = 0;
    this.recalculateStats();
    return { success: true, message: `Removed ${itemName}!` };
  }

  unlockCursedRemoval() { this.myInternalState.cursedRemoved = true; }

  recalculateStats() {
    const bodyBonus = this.getBodyPartTotalStat();
    const eq = this.myInternalState.equipment;
    this.myInternalState.stats = {
      strength: 8 + Math.floor(bodyBonus * 0.3) + (eq.weaponStat || 0) + (eq.accessoryStat || 0),
      defense: 5 + Math.floor(bodyBonus * 0.2) + (eq.armorStat || 0) + (eq.accessoryStat || 0)
    };
  }

  equipWeapon(itemName: string) {
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) return false;
    if (this.myInternalState.equipment.weapon) this.myInternalState.inventory.push(this.myInternalState.equipment.weapon);
    this.myInternalState.equipment.weapon = itemName;
    this.myInternalState.equipment.weaponStat = this.itemStats[itemName] || 2;
    this.myInternalState.inventory.splice(invIndex, 1);
    this.recalculateStats(); return true;
  }

  equipArmor(itemName: string) {
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) return false;
    if (this.myInternalState.equipment.armor) this.myInternalState.inventory.push(this.myInternalState.equipment.armor);
    this.myInternalState.equipment.armor = itemName;
    this.myInternalState.equipment.armorStat = this.itemStats[itemName] || 2;
    this.myInternalState.inventory.splice(invIndex, 1);
    this.recalculateStats(); return true;
  }

  equipAccessory(itemName: string) {
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) return false;
    if (this.myInternalState.equipment.accessory) this.myInternalState.inventory.push(this.myInternalState.equipment.accessory);
    this.myInternalState.equipment.accessory = itemName;
    this.myInternalState.equipment.accessoryStat = this.itemStats[itemName] || 2;
    this.myInternalState.inventory.splice(invIndex, 1);
    this.recalculateStats(); return true;
  }

  addExp(amount: number) {
    this.myInternalState.exp += amount;
    while (this.myInternalState.exp >= this.myInternalState.expToNext && this.myInternalState.level < 50) {
      this.myInternalState.exp -= this.myInternalState.expToNext;
      this.myInternalState.level += 1;
      this.myInternalState.expToNext = Math.floor(this.myInternalState.expToNext * 1.3) + 10;
      this.myInternalState.maxHealth += 10; this.myInternalState.health = this.myInternalState.maxHealth;
      this.myInternalState.maxStamina += 5; this.myInternalState.stamina = this.myInternalState.maxStamina;
      this.generateShopItems();
    }
  }

  addItem(itemName: string) { this.myInternalState.inventory.push(itemName); }

  removeItem(itemName: string) {
    const index = this.myInternalState.inventory.indexOf(itemName);
    if (index > -1) { this.myInternalState.inventory.splice(index, 1); return true; }
    return false;
  }

  useHealthPotion() {
    if (!this.myInternalState.inventory.includes('Health Potion')) return { success: false, message: 'No health potions!' };
    const healAmount = 30 + Math.floor(this.myInternalState.level * 1.5);
    this.myInternalState.health = Math.min(this.myInternalState.health + healAmount, this.myInternalState.maxHealth);
    this.removeItem('Health Potion');
    return { success: true, message: `Healed ${healAmount} HP!` };
  }

  useStaminaPotion() {
    if (!this.myInternalState.inventory.includes('Stamina Potion')) return { success: false, message: 'No stamina potions!' };
    const restoreAmount = 20 + this.myInternalState.level;
    this.myInternalState.stamina = Math.min(this.myInternalState.stamina + restoreAmount, this.myInternalState.maxStamina);
    this.removeItem('Stamina Potion');
    return { success: true, message: `Restored ${restoreAmount} stamina!` };
  }

  addGold(amount: number) { this.myInternalState.gold += amount; }

  sellItem(itemName: string) {
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) {
      return { success: false, message: `${itemName} not in inventory!` };
    }
    
    if (itemName.includes('Cursed')) {
      return { success: false, message: 'Cannot sell cursed items!' };
    }
    
    if (this.myInternalState.equipment.weapon === itemName ||
        this.myInternalState.equipment.armor === itemName ||
        this.myInternalState.equipment.accessory === itemName) {
      return { success: false, message: 'Cannot sell equipped items! Unequip first.' };
    }
    
    if (itemName === 'Health Potion' || itemName === 'Stamina Potion') {
      return { success: false, message: 'Cannot sell potions!' };
    }
    
    const statBonus = this.itemStats[itemName] || 2;
    const sellPrice = Math.max(5, Math.floor((10 + statBonus * 3) / 2));
    
    this.myInternalState.inventory.splice(invIndex, 1);
    this.myInternalState.gold += sellPrice;
    
    return { success: true, message: `Sold ${itemName} for ${sellPrice} gold!` };
  }

  takeDamage(amount: number) {
    const actualDamage = Math.max(1, amount - Math.floor((this.myInternalState.stats.defense || 1) / 2));
    this.myInternalState.health = Math.max(0, this.myInternalState.health - actualDamage);
    return actualDamage;
  }

  updateOwner(name: string, mood: string, relationship: string, description: string) {
    this.myInternalState.owner = { name, mood, relationship, description };
  }

  async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const stats = this.myInternalState;
    let bodyModsStr = '';
    for (const part of stats.bodyParts) {
      if (part.equipped) bodyModsStr += `  - ${part.name}: ${part.equipped}${part.isCursed ? ' ⚠️CURSED⚠️' : ''} (+${part.statBonus} stat)\n`;
    }
    return {
      stageDirections: `[ZOMBIE STATUS]\nLevel: ${stats.level}/50 | HP: ${stats.health}/${stats.maxHealth} | SP: ${stats.stamina}/${stats.maxStamina} | Gold: ${stats.gold}\nStrength: ${stats.stats.strength} | Defense: ${stats.stats.defense}\nWeapon: ${stats.equipment.weapon || 'Fists'} | Armor: ${stats.equipment.armor || 'None'} | Accessory: ${stats.equipment.accessory || 'None'}\nBody Mods:\n${bodyModsStr || '  None'}\nOwner: ${stats.owner.name} | Mood: ${stats.owner.mood} | Relationship: ${stats.owner.relationship}`,
      messageState: stats, modifiedMessage: null, systemMessage: null, error: null, chatState: null,
    };
  }

  async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const content = botMessage.content.toLowerCase();
    
    // ============================================
    // CURSED REMOVAL
    // ============================================
    if (content.includes('curse lifted') || content.includes('cursed removed') || content.includes('rotten arm removed')) {
      this.unlockCursedRemoval();
    }
    
    // ============================================
    // OWNER UPDATES
    // ============================================
    if (content.includes('owner:') || content.includes('master:')) {
      for (const line of content.split('\n')) {
        if (line.includes('owner:') || line.includes('master:')) {
          this.myInternalState.owner.name = line.split(':')[1]?.trim() || this.myInternalState.owner.name;
        }
        if (line.includes('mood:')) {
          this.myInternalState.owner.mood = line.split(':')[1]?.trim() || this.myInternalState.owner.mood;
        }
      }
    }
    
    // ============================================
    // 👇 NEW: DAMAGE DETECTION
    // ============================================
    // Matches: "takes 5 damage", "5 damage", "damage 10"
    const damageMatch = content.match(/(\d+)\s*(damage|dmg)/);
    if (damageMatch) {
      const damage = Math.min(parseInt(damageMatch[1]), 20); // Cap at 20 damage
      this.takeDamage(damage);
    }
    
    // ============================================
    // 👇 NEW: HEALING DETECTION
    // ============================================
    // Matches: "heals 20", "heal 15", "restore 10 HP"
    const healMatch = content.match(/heal[s]?\s+(\d+)/);
    if (healMatch) {
      const healAmount = Math.min(parseInt(healMatch[1]), 30); // Cap at 30 heal
      this.myInternalState.health = Math.min(
        this.myInternalState.health + healAmount,
        this.myInternalState.maxHealth
      );
    }
    
    // ============================================
    // 👇 NEW: GOLD DETECTION
    // ============================================
    // Matches: "found 15 gold", "gains 10 gold", "+10 gold"
    const goldMatch = content.match(/(\d+)\s*gold/);
    if (goldMatch) {
      this.addGold(parseInt(goldMatch[1]));
    }
    
    // ============================================
    // 👇 NEW: EXP DETECTION
    // ============================================
    // Matches: "gains 15 exp", "+10 experience", "exp 20"
    const expMatch = content.match(/(\d+)\s*(exp|experience)/);
    if (expMatch) {
      this.addExp(parseInt(expMatch[1]));
    }
    
    // ============================================
    // 👇 NEW: STAMINA RESTORE
    // ============================================
    // Matches: "restore 10 stamina", "stamina +5"
    const staminaMatch = content.match(/stamina\s*[+]\s*(\d+)/);
    if (staminaMatch) {
      const restoreAmount = Math.min(parseInt(staminaMatch[1]), 15);
      this.myInternalState.stamina = Math.min(
        this.myInternalState.stamina + restoreAmount,
        this.myInternalState.maxStamina
      );
    }
    
    // ============================================
    // 👇 NEW: ITEM DETECTION
    // ============================================
    // Matches: "found a sword", "found shield", "found potion"
    const itemKeywords = ['sword', 'shield', 'ring', 'dagger', 'armor', 'potion', 'helmet', 'cloak', 'amulet', 'staff'];
    for (const keyword of itemKeywords) {
      if (content.includes(keyword)) {
        // Check if it says "found" or "gets" or "receives"
        if (content.includes('found') || content.includes('gets') || content.includes('receives')) {
          const itemName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
          this.addItem(itemName);
          // Give it a stat bonus if it's equipment
          if (!this.itemStats[itemName]) {
            this.itemStats[itemName] = 2 + Math.floor(Math.random() * 3);
          }
          break; // Only add one item per message
        }
      }
    }
    
    return { 
      stageDirections: null, 
      messageState: this.myInternalState, 
      modifiedMessage: null, 
      error: null, 
      systemMessage: null, 
      chatState: null 
    };
  }

  render(): ReactElement {
    return <ZombieUI stage={this} />;
  }
}