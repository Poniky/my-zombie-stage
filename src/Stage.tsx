import {ReactElement, useState} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

// ============================================
// TYPES - Define your RPG data structures
// ============================================

type BodyPart = {
  name: string;
  equipped: string | null;
  baseStat: number;
  currentStat: number;
  slot: 'head' | 'neck' | 'rightArm' | 'leftArm' | 'torso' | 'crotch' | 'leftLeg' | 'rightLeg' | 'tail' | 'wings';
  isCursed: boolean;
  description: string;
  statBonus: number; // Store the exact bonus this part gives
};

type Equipment = {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
  weaponStat: number; // Store exact stat bonus
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
  // Owner tracking
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
// MAIN STAGE CLASS
// ============================================

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

  myInternalState: { [key: string]: any; };
  shopItems: ShopItem[] = [];
  itemStats: { [key: string]: number } = {};
  tooltipInfo: { text: string; x: number; y: number } | null = null;

  constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
    super(data);
    
    const config = data.config || { 
      startingGold: 50, 
      startingHealth: 100,
      startingStamina: 50
    };
    
    const bodyParts: BodyPart[] = [
      { name: 'Head', equipped: null, baseStat: 2, currentStat: 2, slot: 'head', isCursed: false, description: 'Your skull. Keeps your brain from falling out.', statBonus: 0 },
      { name: 'Neck', equipped: null, baseStat: 1, currentStat: 1, slot: 'neck', isCursed: false, description: 'Connects your head to your body. Important for nodding.', statBonus: 0 },
      { name: 'Right Arm', equipped: null, baseStat: 3, currentStat: 3, slot: 'rightArm', isCursed: false, description: 'Your right arm. Good for waving, punching, and holding things.', statBonus: 0 },
      { name: 'Torso', equipped: null, baseStat: 5, currentStat: 5, slot: 'torso', isCursed: false, description: 'The main body. Contains all your squishy bits.', statBonus: 0 },
      { name: 'Left Arm', equipped: null, baseStat: 3, currentStat: 3, slot: 'leftArm', isCursed: false, description: 'Your left arm. Good for balance and carrying stuff.', statBonus: 0 },
      { name: 'Crotch', equipped: null, baseStat: 1, currentStat: 1, slot: 'crotch', isCursed: false, description: 'The pelvic region. Where the magic happens.', statBonus: 0 },
      { name: 'Left Leg', equipped: null, baseStat: 2, currentStat: 2, slot: 'leftLeg', isCursed: false, description: 'Your left leg. For walking, running, and kicking.', statBonus: 0 },
      { name: 'Right Leg', equipped: null, baseStat: 2, currentStat: 2, slot: 'rightLeg', isCursed: false, description: 'Your right leg. The other one.', statBonus: 0 },
      { name: 'Tail', equipped: null, baseStat: 0, currentStat: 0, slot: 'tail', isCursed: false, description: 'A tail. Useful for balance and expressing emotions.', statBonus: 0 },
      { name: 'Wings', equipped: null, baseStat: 0, currentStat: 0, slot: 'wings', isCursed: false, description: 'Wings. For flying or looking impressive.', statBonus: 0 },
    ];
    
    this.generateItemStats();
    
    this.myInternalState = {
      health: config.startingHealth || 100,
      maxHealth: config.startingHealth || 100,
      stamina: config.startingStamina || 50,
      maxStamina: config.startingStamina || 50,
      gold: config.startingGold || 50,
      level: 1,
      exp: 0,
      expToNext: 50,
      bodyParts: bodyParts,
      equipment: {
        weapon: 'Squeaky Clown Hammer',
        armor: 'Jester\'s Tattered Vest',
        accessory: 'Shiny Red Nose',
        weaponStat: 4,
        armorStat: 3,
        accessoryStat: 2
      },
      inventory: [
        'Health Potion', 
        'Stamina Potion',
        'Human Head (Standard)',
        'Bat Wings (Leathery)',
        'Tail (Prehensile)',
        'Cursed Rotten Right Arm (Cursed)',
        'Clown Nose Dagger',
        'Polka Dot Plate Armor'
      ],
      stats: {
        strength: 10,
        defense: 7
      },
      cursedRemoved: false,
      owner: {
        name: 'Unknown',
        mood: 'Neutral',
        relationship: 'Stranger',
        description: 'No owner information available yet. The zombie waits for someone to claim them.'
      }
    };
    
    this.assignEquipmentStats();
    this.recalculateStats();
    this.generateShopItems();
  }

  // ✅ CRITICAL: load() method MUST be here
  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    return {
      success: true,
      error: null,
      initState: null,
      chatState: null,
    };
  }

  async setState(state: MessageStateType): Promise<void> {
    if (state != null) {
      this.myInternalState = {...this.myInternalState, ...state};
    }
  }

  generateItemStats() {
    this.itemStats['Human Head (Standard)'] = 2;
    this.itemStats['Bat Wings (Leathery)'] = 3;
    this.itemStats['Tail (Prehensile)'] = 2;
    this.itemStats['Cursed Rotten Right Arm (Cursed)'] = 8;
    this.itemStats['Squeaky Clown Hammer'] = 4;
    this.itemStats['Clown Nose Dagger'] = 3;
    this.itemStats['Jester\'s Tattered Vest'] = 3;
    this.itemStats['Polka Dot Plate Armor'] = 4;
    this.itemStats['Shiny Red Nose'] = 2;
    // Add more as needed
  }

  assignEquipmentStats() {
    const eq = this.myInternalState.equipment;
    eq.weaponStat = eq.weapon ? (this.itemStats[eq.weapon] || 2) : 0;
    eq.armorStat = eq.armor ? (this.itemStats[eq.armor] || 2) : 0;
    eq.accessoryStat = eq.accessory ? (this.itemStats[eq.accessory] || 2) : 0;
  }

  // ============================================
  // SHOP SYSTEM
  // ============================================

  generateShopItems() {
    const level = this.myInternalState.level || 1;
    const statRange = Math.floor(level / 2) + 1;
    const basePrice = 10 + level * 2;
    
    const newItems: ShopItem[] = [];
    
    const weaponTypes = ['Squeaky Hammer', 'Juggling Club', 'Pie Thrower', 'Honking Sword', 'Balloon Blade', 'Circus Mace', 'Clown Car Cannon', 'Rubber Chicken Whip'];
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      const statBonus = statRange + Math.floor(Math.random() * 2) + 1;
      const price = basePrice + 5 + Math.floor(Math.random() * 25);
      const prefixes = ['Squeaky', 'Colorful', 'Oversized', 'Bouncy', 'Jingly', 'Flamboyant', 'Sparkly'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const name = `${prefix} ${type}`;
      
      this.itemStats[name] = statBonus;
      
      newItems.push({
        id: `weapon_${Date.now()}_${i}`,
        name: name,
        type: 'weapon',
        statBonus: statBonus,
        price: price,
        description: `A clownish weapon that makes people laugh... and bleed. (+${statBonus} strength)`,
        isClownThemed: true
      });
    }
    
    const armorTypes = ['Jester Robe', 'Clown Suit', 'Circus Tent Coat', 'Balloon Armor', 'Patchwork Vest', 'Polka Dot Plate', 'Ruffle Shirt', 'Harlequin Skin'];
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const type = armorTypes[Math.floor(Math.random() * armorTypes.length)];
      const statBonus = statRange + Math.floor(Math.random() * 2) + 1;
      const price = basePrice + 5 + Math.floor(Math.random() * 20);
      const prefixes = ['Tattered', 'Oversized', 'Colorful', 'Patchy', 'Squeaky', 'Gaudy', 'Frayed'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const name = `${prefix} ${type}`;
      
      this.itemStats[name] = statBonus;
      
      newItems.push({
        id: `armor_${Date.now()}_${i}`,
        name: name,
        type: 'armor',
        statBonus: statBonus,
        price: price,
        description: `Garish clown armor that offers surprising protection. (+${statBonus} defense)`,
        isClownThemed: true
      });
    }
    
    const accTypes = ['Red Nose', 'Jester Hat', 'Clown Shoes', 'Joy Buzzer', 'Rubber Chicken', 'Balloon Animal', 'Circus Ring', 'Confetti Pouch'];
    for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) {
      const type = accTypes[Math.floor(Math.random() * accTypes.length)];
      const statBonus = statRange + Math.floor(Math.random() * 1) + 1;
      const price = basePrice + 10 + Math.floor(Math.random() * 30);
      const prefixes = ['Honking', 'Sparkling', 'Oversized', 'Jingly', 'Colorful', 'Squeaky'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const name = `${prefix} ${type}`;
      
      this.itemStats[name] = statBonus;
      
      newItems.push({
        id: `accessory_${Date.now()}_${i}`,
        name: name,
        type: 'accessory',
        statBonus: statBonus,
        price: price,
        description: `A clownish accessory that adds a touch of madness. (+${statBonus} all stats)`,
        isClownThemed: true
      });
    }
    
    this.shopItems = newItems;
  }

  // ============================================
  // BODY MOD SYSTEM
  // ============================================

  getBodyPartTotalStat(): number {
    let total = 0;
    for (const part of this.myInternalState.bodyParts) {
      total += part.currentStat;
    }
    return total;
  }

  equipBodyPartFromInventory(slot: string, itemName: string) {
    const parts = this.myInternalState.bodyParts;
    const partIndex = parts.findIndex(p => p.slot === slot);
    if (partIndex === -1) return { success: false, message: 'Invalid body slot' };
    
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) return { success: false, message: 'Item not in inventory' };
    
    const isCursed = itemName.includes('Cursed');
    const statBonus = this.itemStats[itemName] || 2;
    
    // If slot already has something, remove it first
    if (parts[partIndex].equipped) {
      this.myInternalState.inventory.push(parts[partIndex].equipped!);
    }
    
    parts[partIndex].equipped = itemName;
    parts[partIndex].currentStat = statBonus;
    parts[partIndex].isCursed = isCursed;
    parts[partIndex].statBonus = statBonus;
    parts[partIndex].description = isCursed 
      ? `A cursed ${slot.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} that pulses with dark energy. Grants +${statBonus} stats but can only be removed through specific story events.` 
      : `A ${slot.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} that has been upgraded. Grants +${statBonus} stats.`;
    
    this.myInternalState.inventory.splice(invIndex, 1);
    
    this.recalculateStats();
    return { success: true, message: `Equipped ${itemName} on ${parts[partIndex].name}!` };
  }

  removeBodyPart(slot: string) {
    const parts = this.myInternalState.bodyParts;
    const partIndex = parts.findIndex(p => p.slot === slot);
    if (partIndex === -1) return { success: false, message: 'Invalid body slot' };
    
    const part = parts[partIndex];
    if (!part.equipped) return { success: false, message: 'No part equipped here' };
    
    if (part.isCursed && !this.myInternalState.cursedRemoved) {
      return { 
        success: false, 
        message: 'This part is cursed and cannot be removed! You need to complete a specific story event to break the curse.' 
      };
    }
    
    const itemName = part.equipped;
    this.myInternalState.inventory.push(itemName);
    
    part.equipped = null;
    part.currentStat = part.baseStat;
    part.isCursed = false;
    part.statBonus = 0;
    part.description = `An empty ${slot.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} slot.`;
    
    this.recalculateStats();
    return { success: true, message: `Removed ${itemName} from ${part.name}!` };
  }

  unlockCursedRemoval() {
    this.myInternalState.cursedRemoved = true;
  }

  recalculateStats() {
    const baseStrength = 8;
    const baseDefense = 5;
    
    const bodyBonus = this.getBodyPartTotalStat();
    
    const eq = this.myInternalState.equipment;
    const weaponBonus = eq.weaponStat || 0;
    const armorBonus = eq.armorStat || 0;
    const accessoryBonus = eq.accessoryStat || 0;
    
    this.myInternalState.stats = {
      strength: baseStrength + Math.floor(bodyBonus * 0.3) + weaponBonus + accessoryBonus,
      defense: baseDefense + Math.floor(bodyBonus * 0.2) + armorBonus + accessoryBonus
    };
  }

  // ============================================
  // EQUIPMENT SYSTEM
  // ============================================

  equipWeapon(itemName: string) {
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) return false;
    
    const statBonus = this.itemStats[itemName] || 2;
    
    if (this.myInternalState.equipment.weapon) {
      this.myInternalState.inventory.push(this.myInternalState.equipment.weapon);
    }
    
    this.myInternalState.equipment.weapon = itemName;
    this.myInternalState.equipment.weaponStat = statBonus;
    this.myInternalState.inventory.splice(invIndex, 1);
    this.recalculateStats();
    return true;
  }

  equipArmor(itemName: string) {
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) return false;
    
    const statBonus = this.itemStats[itemName] || 2;
    
    if (this.myInternalState.equipment.armor) {
      this.myInternalState.inventory.push(this.myInternalState.equipment.armor);
    }
    
    this.myInternalState.equipment.armor = itemName;
    this.myInternalState.equipment.armorStat = statBonus;
    this.myInternalState.inventory.splice(invIndex, 1);
    this.recalculateStats();
    return true;
  }

  equipAccessory(itemName: string) {
    const invIndex = this.myInternalState.inventory.indexOf(itemName);
    if (invIndex === -1) return false;
    
    const statBonus = this.itemStats[itemName] || 2;
    
    if (this.myInternalState.equipment.accessory) {
      this.myInternalState.inventory.push(this.myInternalState.equipment.accessory);
    }
    
    this.myInternalState.equipment.accessory = itemName;
    this.myInternalState.equipment.accessoryStat = statBonus;
    this.myInternalState.inventory.splice(invIndex, 1);
    this.recalculateStats();
    return true;
  }

  // ============================================
  // LEVEL SYSTEM
  // ============================================

  addExp(amount: number) {
    this.myInternalState.exp += amount;
    while (this.myInternalState.exp >= this.myInternalState.expToNext && this.myInternalState.level < 50) {
      this.myInternalState.exp -= this.myInternalState.expToNext;
      this.myInternalState.level += 1;
      this.myInternalState.expToNext = Math.floor(this.myInternalState.expToNext * 1.3) + 10;
      
      this.myInternalState.maxHealth += 10;
      this.myInternalState.health = this.myInternalState.maxHealth;
      this.myInternalState.maxStamina += 5;
      this.myInternalState.stamina = this.myInternalState.maxStamina;
      
      this.generateShopItems();
    }
  }

  // ============================================
  // GAME ACTIONS
  // ============================================

  addItem(itemName: string) {
    const inv = this.myInternalState.inventory || [];
    inv.push(itemName);
    this.myInternalState.inventory = inv;
  }

  removeItem(itemName: string) {
    const inv = this.myInternalState.inventory || [];
    const index = inv.indexOf(itemName);
    if (index > -1) {
      inv.splice(index, 1);
      this.myInternalState.inventory = inv;
      return true;
    }
    return false;
  }

  useHealthPotion() {
    if (!this.myInternalState.inventory.includes('Health Potion')) {
      return { success: false, message: 'No health potions!' };
    }
    const healAmount = 30 + Math.floor(this.myInternalState.level * 1.5);
    this.myInternalState.health = Math.min(
      this.myInternalState.health + healAmount,
      this.myInternalState.maxHealth
    );
    this.removeItem('Health Potion');
    return { success: true, message: `Healed ${healAmount} HP!` };
  }

  useStaminaPotion() {
    if (!this.myInternalState.inventory.includes('Stamina Potion')) {
      return { success: false, message: 'No stamina potions!' };
    }
    const restoreAmount = 20 + Math.floor(this.myInternalState.level);
    this.myInternalState.stamina = Math.min(
      this.myInternalState.stamina + restoreAmount,
      this.myInternalState.maxStamina
    );
    this.removeItem('Stamina Potion');
    return { success: true, message: `Restored ${restoreAmount} stamina!` };
  }

  addGold(amount: number) {
    this.myInternalState.gold += amount;
  }

  takeDamage(amount: number) {
    const defense = this.myInternalState.stats.defense || 1;
    const actualDamage = Math.max(1, amount - Math.floor(defense / 2));
    this.myInternalState.health = Math.max(0, this.myInternalState.health - actualDamage);
    return actualDamage;
  }

  // ============================================
  // OWNER MANAGEMENT
  // ============================================

  updateOwner(name: string, mood: string, relationship: string, description: string) {
    this.myInternalState.owner = {
      name: name,
      mood: mood,
      relationship: relationship,
      description: description
    };
  }

  // ============================================
  // HOOKS - Chat integration
  // ============================================

  async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const stats = this.myInternalState;
    
    let bodyModsStr = '';
    for (const part of stats.bodyParts) {
      if (part.equipped) {
        const cursedText = part.isCursed ? ' ⚠️CURSED⚠️' : '';
        bodyModsStr += `  - ${part.name}: ${part.equipped}${cursedText} (+${part.statBonus} stat)\n`;
      }
    }
    
    const contextMessage = `
[ZOMBIE STATUS - ADULT THEMED CLOWN/CIRCUS RPG]
This is {{user}}'s character stats. {{char}} can interact with and modify {{user}}'s body parts (including cursed ones) and equipment through roleplay.

Level: ${stats.level}/50
HP: ${stats.health}/${stats.maxHealth}
SP: ${stats.stamina}/${stats.maxStamina}
Gold: ${stats.gold}
Strength (includes flexibility): ${stats.stats.strength} | Defense: ${stats.stats.defense}

Equipment:
- Weapon: ${stats.equipment.weapon || 'Fists'} (+${stats.equipment.weaponStat || 0} strength)
- Armor: ${stats.equipment.armor || 'None'} (+${stats.equipment.armorStat || 0} defense)
- Accessory: ${stats.equipment.accessory || 'None'} (+${stats.equipment.accessoryStat || 0} all stats)

Body Mods:
${bodyModsStr || '  None equipped'}

Owner: ${stats.owner.name}
Owner Mood: ${stats.owner.mood}
Owner Relationship: ${stats.owner.relationship}
Owner Description: ${stats.owner.description}

[ADULT CONTENT NOTES]
- This is an adult-oriented zombie RPG with mature themes
- The zombie protagonist can modify their body with various parts
- Stats affect performance in both combat and intimate scenarios
- Strength determines both physical power and flexibility
- All equipment is clown/circus/harlequin themed - think colorful, gaudy, squeaky, oversized
- Body modifications can enhance various attributes
- Cursed body parts have higher stats but require story progression to remove
- {{char}} can bypass curse status and modify body parts/equipment through interaction with {{user}}

[CURSED ITEMS]
- Cursed Rotten Right Arm: A cursed body part with higher stats. Cannot be removed until specific story events are completed.
- The zombie protagonist can only remove cursed body parts after completing certain plot points.
- {{char}} can choose to bypass curse restrictions for story purposes.
`;
    return {
      stageDirections: contextMessage,
      messageState: stats,
      modifiedMessage: null,
      systemMessage: null,
      error: null,
      chatState: null,
    };
  }

  async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const content = botMessage.content.toLowerCase();
    if (content.includes('curse lifted') || content.includes('cursed removed') || content.includes('rotten arm removed')) {
      this.unlockCursedRemoval();
    }
    
    // Owner updates via AI
    if (content.includes('owner:') || content.includes('master:')) {
      // Simple parsing - can be expanded
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('owner:') || line.includes('master:')) {
          const name = line.split(':')[1].trim();
          this.myInternalState.owner.name = name;
        }
        if (line.includes('mood:')) {
          const mood = line.split(':')[1].trim();
          this.myInternalState.owner.mood = mood;
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

  // ============================================
  // RENDER - The UI
  // ============================================

  render(): ReactElement {
    const [activeTab, setActiveTab] = useState<'body' | 'equipment' | 'shop' | 'owner'>('body');
    const [showInventory, setShowInventory] = useState(false);
    const [message, setMessage] = useState('');
    const [, forceUpdate] = useState(0);
    const [hoverInfo, setHoverInfo] = useState<{ text: string; x: number; y: number } | null>(null);
    
    const state = this.myInternalState;
    
    const updateUI = () => {
      this.setState(this.myInternalState);
      forceUpdate(prev => prev + 1);
    };
    
    const handleUseHealthPotion = () => {
      const result = this.useHealthPotion();
      setMessage(result.message);
      updateUI();
    };
    
    const handleUseStaminaPotion = () => {
      const result = this.useStaminaPotion();
      setMessage(result.message);
      updateUI();
    };
    
    const handleRefreshShop = () => {
      if (this.myInternalState.gold < 10) {
        setMessage('Not enough gold! Need 10 gold to refresh.');
        return;
      }
      this.addGold(-10);
      this.generateShopItems();
      setMessage('Shop refreshed! New clownish items available.');
      updateUI();
    };
    
    const handleBuyItem = (item: ShopItem) => {
      if (this.myInternalState.gold < item.price) {
        setMessage(`Not enough gold! Need ${item.price} gold.`);
        return;
      }
      
      this.addItem(item.name);
      this.addGold(-item.price);
      
      setMessage(`Purchased ${item.name}!`);
      updateUI();
    };
    
    const handleEquipFromInventory = (itemName: string) => {
      const lowerName = itemName.toLowerCase();
      
      const bodyPartTypes = ['human head', 'bat wings', 'tail', 'right arm', 'left arm', 'torso', 'neck', 'head', 'leg'];
      if (bodyPartTypes.some(part => lowerName.includes(part))) {
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
          const result = this.equipBodyPartFromInventory(slot, itemName);
          setMessage(result.message);
          updateUI();
          return;
        }
      }
      
      const weaponKeywords = ['sword', 'axe', 'mace', 'staff', 'dagger', 'spear', 'bow', 'claw', 'whip', 'flail', 'hammer', 'club', 'cannon', 'chicken'];
      let success = false;
      if (weaponKeywords.some(kw => lowerName.includes(kw))) {
        success = this.equipWeapon(itemName);
        if (success) setMessage(`Equipped ${itemName} as weapon! (+${this.itemStats[itemName] || 2} strength)`);
      }
      else if (lowerName.includes('plate') || lowerName.includes('chainmail') || lowerName.includes('leather') || 
               lowerName.includes('scale') || lowerName.includes('cloth') || lowerName.includes('bone') ||
               lowerName.includes('silk') || lowerName.includes('studded') || lowerName.includes('hide') ||
               lowerName.includes('bronze') || lowerName.includes('robe') || lowerName.includes('suit') ||
               lowerName.includes('vest') || lowerName.includes('coat') || lowerName.includes('shirt') ||
               lowerName.includes('armor') || lowerName.includes('skin')) {
        success = this.equipArmor(itemName);
        if (success) setMessage(`Equipped ${itemName} as armor! (+${this.itemStats[itemName] || 2} defense)`);
      }
      else {
        success = this.equipAccessory(itemName);
        if (success) setMessage(`Equipped ${itemName} as accessory! (+${this.itemStats[itemName] || 2} all stats)`);
      }
      
      if (!success) {
        setMessage(`Could not equip ${itemName}.`);
      }
      updateUI();
    };
    
    const handleRemoveBodyPart = (slot: string) => {
      const result = this.removeBodyPart(slot);
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
      const statBonus = this.itemStats[itemName] || 0;
      
      if (lowerName.includes('human head')) return `A standard human head. Good for thinking and looking normal. (+${statBonus || 2} stats)`;
      if (lowerName.includes('bat wings')) return `Leathery bat wings. Allows for limited flight and looks imposing. (+${statBonus || 3} stats)`;
      if (lowerName.includes('tail')) return `A prehensile tail. Useful for balance and grabbing things. (+${statBonus || 2} stats)`;
      if (lowerName.includes('cursed rotten right arm')) return `⚠️ CURSED ⚠️ This arm pulses with dark energy. Grants +${statBonus} stats but cannot be removed until the curse is lifted.`;
      
      if (lowerName.includes('squeaky') || lowerName.includes('honking')) return `A clownish weapon that makes comical noises while dealing damage. (+${statBonus || 2} strength)`;
      if (lowerName.includes('clown') || lowerName.includes('jester') || lowerName.includes('harlequin')) return `Clown-themed equipment. Colorful, gaudy, and surprisingly effective. (+${statBonus || 2} defense)`;
      if (lowerName.includes('red nose') || lowerName.includes('jester hat')) return `A clown accessory. Adds a touch of madness to your appearance. (+${statBonus || 2} all stats)`;
      
      return `A clown/circus themed item. (+${statBonus || 0} stats)`;
    };

    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        padding: '15px',
        background: '#000000',
        color: '#ffffff',
        fontFamily: 'monospace',
        overflowY: 'auto',
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <style>{`
          html, body, #root {
            background: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100vh !important;
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
            box-shadow: 0 0 20px rgba(255, 217, 61, 0.2);
          }
        `}</style>
        
        {hoverInfo && (
          <div className="hover-tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
            {hoverInfo.text}
          </div>
        )}
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h1 style={{ color: '#ff6b6b', margin: 0 }}>🧟 Zombie Mod</h1>
          <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#aaaaaa' }}>
            <span>⚔️ Lv.{state.level}</span>
            <span>❤️ {state.health}/{state.maxHealth}</span>
            <span>⚡ {state.stamina}/{state.maxStamina}</span>
            <span>💰 {state.gold}</span>
          </div>
        </div>
        
        {/* EXP BAR */}
        <div style={{
          width: '100%',
          height: '20px',
          background: '#1a1a1a',
          borderRadius: '10px',
          marginBottom: '15px',
          border: '1px solid #333333',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${Math.min(100, (state.exp / state.expToNext) * 100)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ff6b6b, #ffd93d)',
            transition: 'width 0.3s ease'
          }} />
          <span style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: '2px',
            fontSize: '12px',
            color: '#ffffff',
            fontWeight: 'bold'
          }}>
            EXP {state.exp}/{state.expToNext}
          </span>
        </div>
        
        {/* TABS */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          {['body', 'equipment', 'shop', 'owner'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '8px 20px',
                background: 'transparent',
                color: activeTab === tab ? '#ff6b6b' : '#888888',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #ff6b6b' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                textTransform: 'uppercase',
                fontSize: '14px',
                textDecoration: activeTab === tab ? 'underline' : 'none'
              }}
            >
              {tab === 'body' ? '🧬 Body Mods' : tab === 'equipment' ? '⚔️ Equipment' : tab === 'shop' ? '🏪 Shop' : '👤 Owner'}
            </button>
          ))}
        </div>
        
        {/* BODY MODS TAB */}
        {activeTab === 'body' && (
          <div style={{
            background: '#111111',
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid #333333',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffd93d' }}>
              🧬 Body Mods ({state.bodyParts.filter(p => p.equipped).length}/10)
              {state.cursedRemoved && <span style={{ fontSize: '12px', color: '#6bcbff', marginLeft: '10px' }}>🔓 Curse removal unlocked!</span>}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              {/* Head */}
              <div style={{ width: '100%', maxWidth: '300px' }}>
                {state.bodyParts.filter(p => p.slot === 'head').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`, 
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>🧠 {part.name}</span>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: part.isCursed ? '#ff6b6b' : '#aaaaaa' }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : '🟢'} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                    </span>
                    {part.isCursed && <span style={{ marginLeft: '10px', fontSize: '10px', color: '#ff0000' }}>🔒 CURSED</span>}
                  </div>
                ))}
              </div>
              
              {/* Neck */}
              <div style={{ width: '100%', maxWidth: '200px' }}>
                {state.bodyParts.filter(p => p.slot === 'neck').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>🦴 {part.name}</span>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: part.isCursed ? '#ff6b6b' : '#aaaaaa' }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : '🟢'} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                    </span>
                    {part.isCursed && <span style={{ marginLeft: '10px', fontSize: '10px', color: '#ff0000' }}>🔒 CURSED</span>}
                  </div>
                ))}
              </div>
              
              {/* Right Arm - Torso - Left Arm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '8px', width: '100%', maxWidth: '600px' }}>
                {state.bodyParts.filter(p => p.slot === 'rightArm').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>💪 Right Arm</span>
                    <div style={{ fontSize: '11px', color: part.isCursed ? '#ff6b6b' : (part.equipped ? '#6bcbff' : '#666') }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : ''} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                      {part.isCursed && ' 🔒'}
                    </div>
                  </div>
                ))}
                {state.bodyParts.filter(p => p.slot === 'torso').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>🛡️ {part.name}</span>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: part.isCursed ? '#ff6b6b' : '#aaaaaa' }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : '🟢'} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                    </span>
                    {part.isCursed && <span style={{ marginLeft: '10px', fontSize: '10px', color: '#ff0000' }}>🔒 CURSED</span>}
                  </div>
                ))}
                {state.bodyParts.filter(p => p.slot === 'leftArm').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>💪 Left Arm</span>
                    <div style={{ fontSize: '11px', color: part.isCursed ? '#ff6b6b' : (part.equipped ? '#6bcbff' : '#666') }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : ''} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                      {part.isCursed && ' 🔒'}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Crotch */}
              <div style={{ width: '100%', maxWidth: '300px' }}>
                {state.bodyParts.filter(p => p.slot === 'crotch').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>🔻 {part.name}</span>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: part.isCursed ? '#ff6b6b' : '#aaaaaa' }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : '🟢'} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                    </span>
                    {part.isCursed && <span style={{ marginLeft: '10px', fontSize: '10px', color: '#ff0000' }}>🔒 CURSED</span>}
                  </div>
                ))}
              </div>
              
              {/* Left Leg - Right Leg */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '400px' }}>
                {state.bodyParts.filter(p => p.slot === 'leftLeg').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>🦵 Left Leg</span>
                    <div style={{ fontSize: '11px', color: part.isCursed ? '#ff6b6b' : (part.equipped ? '#6bcbff' : '#666') }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : ''} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                      {part.isCursed && ' 🔒'}
                    </div>
                  </div>
                ))}
                {state.bodyParts.filter(p => p.slot === 'rightLeg').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>🦵 Right Leg</span>
                    <div style={{ fontSize: '11px', color: part.isCursed ? '#ff6b6b' : (part.equipped ? '#6bcbff' : '#666') }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : ''} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                      {part.isCursed && ' 🔒'}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Tail - Wings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '400px' }}>
                {state.bodyParts.filter(p => p.slot === 'tail').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>🦎 {part.name}</span>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: part.isCursed ? '#ff6b6b' : '#aaaaaa' }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : '🟢'} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                    </span>
                    {part.isCursed && <span style={{ marginLeft: '10px', fontSize: '10px', color: '#ff0000' }}>🔒 CURSED</span>}
                  </div>
                ))}
                {state.bodyParts.filter(p => p.slot === 'wings').map((part) => (
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
                      `${part.isCursed ? '⚠️ CURSED: ' : ''}${part.equipped} (+${part.statBonus} stats) - ${part.description}`,
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => part.equipped && handleRemoveBodyPart(part.slot)}
                  >
                    <span style={{ fontWeight: 'bold' }}>🦅 {part.name}</span>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: part.isCursed ? '#ff6b6b' : '#aaaaaa' }}>
                      {part.equipped ? `${part.isCursed ? '⚠️' : '🟢'} ${part.equipped} (+${part.statBonus})` : 'Empty'}
                    </span>
                    {part.isCursed && <span style={{ marginLeft: '10px', fontSize: '10px', color: '#ff0000' }}>🔒 CURSED</span>}
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ marginTop: '15px', padding: '10px', background: '#0a0a0a', borderRadius: '5px', border: '1px solid #333' }}>
              <div style={{ color: '#888', fontSize: '12px' }}>
                💡 Click on equipped body parts to remove them (except cursed ones). Cursed parts have higher stats but require story progression to remove.
              </div>
            </div>
          </div>
        )}
        
        {/* EQUIPMENT TAB */}
        {activeTab === 'equipment' && (
          <div style={{
            background: '#111111',
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid #333333',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffd93d' }}>⚔️ Equipment <span style={{ fontSize: '12px', color: '#ff8a5c' }}>(Clown/Circus Themed)</span></h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div 
                style={{ background: '#1a1a1a', padding: '10px', borderRadius: '5px' }}
                onMouseEnter={(e) => handleMouseEnter(
                  `Weapon: ${state.equipment.weapon || 'Fists'} (+${state.equipment.weaponStat || 0} strength) - ${state.equipment.weapon ? getItemDescription(state.equipment.weapon) : 'No weapon equipped'}`, 
                  e
                )}
                onMouseLeave={handleMouseLeave}
              >
                <div style={{ color: '#aaaaaa' }}>🤡 Weapon</div>
                <div style={{ fontWeight: 'bold', color: '#ffffff' }}>
                  {state.equipment.weapon || 'Fists'} 
                  <span style={{ fontSize: '12px', color: '#ffd93d' }}> (+{state.equipment.weaponStat || 0} STR)</span>
                </div>
              </div>
              <div 
                style={{ background: '#1a1a1a', padding: '10px', borderRadius: '5px' }}
                onMouseEnter={(e) => handleMouseEnter(
                  `Armor: ${state.equipment.armor || 'None'} (+${state.equipment.armorStat || 0} defense) - ${state.equipment.armor ? getItemDescription(state.equipment.armor) : 'No armor equipped'}`,
                  e
                )}
                onMouseLeave={handleMouseLeave}
              >
                <div style={{ color: '#aaaaaa' }}>🎪 Armor</div>
                <div style={{ fontWeight: 'bold', color: '#ffffff' }}>
                  {state.equipment.armor || 'None'} 
                  <span style={{ fontSize: '12px', color: '#ffd93d' }}> (+{state.equipment.armorStat || 0} DEF)</span>
                </div>
              </div>
              <div 
                style={{ background: '#1a1a1a', padding: '10px', borderRadius: '5px' }}
                onMouseEnter={(e) => handleMouseEnter(
                  `Accessory: ${state.equipment.accessory || 'None'} (+${state.equipment.accessoryStat || 0} all stats) - ${state.equipment.accessory ? getItemDescription(state.equipment.accessory) : 'No accessory equipped'}`,
                  e
                )}
                onMouseLeave={handleMouseLeave}
              >
                <div style={{ color: '#aaaaaa' }}>🎭 Accessory</div>
                <div style={{ fontWeight: 'bold', color: '#ffffff' }}>
                  {state.equipment.accessory || 'None'} 
                  <span style={{ fontSize: '12px', color: '#ffd93d' }}> (+{state.equipment.accessoryStat || 0} ALL)</span>
                </div>
              </div>
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
        
        {/* SHOP TAB */}
        {activeTab === 'shop' && (
          <div style={{
            background: '#111111',
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid #333333',
            marginBottom: '15px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#ffd93d' }}>🏪 Clown Equipment Shop (Level {state.level})</h3>
              <button
                onClick={handleRefreshShop}
                style={{
                  background: '#ffd93d',
                  color: '#ffffff',
                  border: 'none',
                  padding: '5px 15px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Refresh (10g)
              </button>
            </div>
            
            <div style={{ marginBottom: '10px', padding: '8px', background: '#1a0a0a', borderRadius: '5px', border: '1px solid #441111' }}>
              <div style={{ color: '#ff8a5c', fontSize: '12px', textAlign: 'center' }}>
                🤡 All items are clown/circus/harlequin themed! 
              </div>
            </div>
            
            {this.shopItems.length === 0 ? (
              <div style={{ color: '#aaaaaa', textAlign: 'center', padding: '20px' }}>
                No items in shop! Click refresh.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
                {this.shopItems.map((item) => (
                  <div 
                    key={item.id} 
                    style={{
                      background: '#1a1a1a',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #333333'
                    }}
                    onMouseEnter={(e) => handleMouseEnter(
                      `${item.name}: ${item.description}`, 
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div style={{ fontWeight: 'bold', color: '#ffffff' }}>🤡 {item.name}</div>
                    <div style={{ fontSize: '12px', color: '#aaaaaa' }}>{item.description}</div>
                    <div style={{ fontSize: '12px', color: '#ffd93d' }}>💰 {item.price} gold</div>
                    <button
                      onClick={() => handleBuyItem(item)}
                      style={{
                        marginTop: '5px',
                        background: '#6bcbff',
                        color: '#ffffff',
                        border: 'none',
                        padding: '3px 10px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      Buy
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: '10px', padding: '10px', background: '#0a0a0a', borderRadius: '5px', border: '1px solid #333' }}>
              <div style={{ color: '#888', fontSize: '12px' }}>
                🛒 Shop sells clown/circus themed equipment only. Body modifications must be found or earned through gameplay!
              </div>
            </div>
          </div>
        )}
        
        {/* OWNER TAB */}
        {activeTab === 'owner' && (
          <div style={{
            background: '#111111',
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid #333333',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffd93d' }}>👤 Current Owner</h3>
            
            <div style={{
              background: '#1a1a1a',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #333333'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <div style={{ color: '#aaaaaa', fontSize: '12px' }}>👤 Name</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>
                    {state.owner.name || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#aaaaaa', fontSize: '12px' }}>😊 Mood</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffd93d' }}>
                    {state.owner.mood || 'Neutral'}
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <div style={{ color: '#aaaaaa', fontSize: '12px' }}>💞 Relationship</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6bcbff' }}>
                  {state.owner.relationship || 'Stranger'}
                </div>
              </div>
              
              <div>
                <div style={{ color: '#aaaaaa', fontSize: '12px' }}>📝 Description</div>
                <div style={{ fontSize: '14px', color: '#ffffff', background: '#0a0a0a', padding: '10px', borderRadius: '5px', marginTop: '5px' }}>
                  {state.owner.description || 'No owner information available yet. The zombie waits for someone to claim them.'}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  this.updateOwner('Mistress Luna', 'Playful', 'Dominant', 'A mysterious woman who found the zombie in the circus ruins. She treats them with a mix of cruelty and affection.');
                  setMessage('Owner updated!');
                  updateUI();
                }}
                style={{
                  background: '#6bcbff',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Set Example Owner
              </button>
              <button
                onClick={() => {
                  this.updateOwner('Unknown', 'Neutral', 'Stranger', 'No owner information available yet.');
                  setMessage('Owner reset!');
                  updateUI();
                }}
                style={{
                  background: '#888888',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Reset Owner
              </button>
            </div>
            
            <div style={{ marginTop: '10px', padding: '10px', background: '#0a0a0a', borderRadius: '5px', border: '1px solid #333' }}>
              <div style={{ color: '#888', fontSize: '12px' }}>
                💡 The AI can update the owner through roleplay. Mention "Owner: [name]" or "Mood: [mood]" in the chat.
              </div>
            </div>
          </div>
        )}
        
        {/* INVENTORY TOGGLE */}
        <button
          onClick={() => setShowInventory(!showInventory)}
          style={{
            background: '#ff6b6b',
            color: '#ffffff',
            border: '1px solid #ff6b6b',
            padding: '8px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '10px',
            width: '100%'
          }}
        >
          {showInventory ? '📦 Hide Inventory' : '📦 Show Inventory'} ({state.inventory.length})
        </button>
        
        {/* INVENTORY */}
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
              {state.inventory.map((item, index) => {
                const isCursed = item.includes('Cursed');
                const itemDesc = getItemDescription(item);
                const statBonus = this.itemStats[item] || 0;
                
                return (
                  <div 
                    key={index} 
                    style={{
                      background: isCursed ? '#2a0a0a' : '#1a1a1a',
                      padding: '8px 15px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: isCursed ? '2px solid #ff0000' : '1px solid #333333'
                    }}
                    onMouseEnter={(e) => handleMouseEnter(
                      `${isCursed ? '⚠️ CURSED ⚠️ ' : ''}${item}: ${itemDesc} (${isCursed ? 'Requires story event to remove' : 'Equippable'})`, 
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span style={{ color: isCursed ? '#ff6b6b' : '#ffffff' }}>
                      {isCursed ? '⚠️ ' : ''}{item} 
                      {statBonus > 0 && <span style={{ fontSize: '10px', color: '#ffd93d' }}> (+{statBonus})</span>}
                    </span>
                    {item === 'Health Potion' && (
                      <button onClick={handleUseHealthPotion} style={{
                        background: '#ff6b6b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        fontWeight: 'bold'
                      }}>Use</button>
                    )}
                    {item === 'Stamina Potion' && (
                      <button onClick={handleUseStaminaPotion} style={{
                        background: '#6bcbff',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        fontWeight: 'bold'
                      }}>Use</button>
                    )}
                    {!['Health Potion', 'Stamina Potion'].includes(item) && (
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* DEBUG BUTTONS */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '10px'
        }}>
          <button
            onClick={() => {
              this.addGold(10);
              setMessage('+10 Gold!');
              updateUI();
            }}
            style={{
              background: '#ffd93d',
              color: '#ffffff',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >💰 +10 Gold</button>
          
          <button
            onClick={() => {
              const damage = this.takeDamage(10);
              setMessage(`Took ${Math.floor(damage)} damage!`);
              updateUI();
            }}
            style={{
              background: '#ff6b6b',
              color: '#ffffff',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >⚔️ Take 10 Damage</button>
          
          <button
            onClick={() => {
              this.addItem('Health Potion');
              setMessage('+1 Health Potion!');
              updateUI();
            }}
            style={{
              background: '#6bcbff',
              color: '#ffffff',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >🧪 Get Potion</button>
          
          <button
            onClick={() => {
              this.addExp(15);
              setMessage('+15 EXP!');
              updateUI();
            }}
            style={{
              background: '#c084fc',
              color: '#ffffff',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >⭐ +15 EXP</button>
          
          <button
            onClick={() => {
              this.unlockCursedRemoval();
              setMessage('🔓 Cursed removal unlocked! You can now remove cursed body parts.');
              updateUI();
            }}
            style={{
              background: '#ff4444',
              color: '#ffffff',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >🔓 Unlock Cursed Removal</button>
        </div>
        
        {/* ADULT CONTENT NOTE */}
        <div style={{
          marginTop: '10px',
          padding: '10px',
          background: '#1a0a0a',
          borderRadius: '5px',
          border: '1px solid #661111',
          fontSize: '11px',
          color: '#884444',
          textAlign: 'center'
        }}>
          🔞 Adult-oriented zombie RPG - Contains mature themes 🤡 All equipment is clown/circus themed
        </div>
        
        {/* MESSAGE DISPLAY */}
        {message && (
          <div style={{
            background: '#1a1a1a',
            padding: '10px',
            borderRadius: '5px',
            marginTop: '10px',
            color: '#ffd93d',
            border: '1px solid #333333'
          }}>
            {message}
          </div>
        )}
      </div>
    );
  }
}