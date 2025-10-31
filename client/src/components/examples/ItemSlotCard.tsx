import ItemSlotCard from '../ItemSlotCard';

export default function ItemSlotCardExample() {
  return (
    <div className="p-6 grid grid-cols-2 gap-4 max-w-md">
      <ItemSlotCard onAdd={() => console.log('Add item')} />
      <ItemSlotCard
        item={{
          name: 'White T-Shirt',
          isOnShoppingList: false,
        }}
        onClick={() => console.log('View item')}
      />
      <ItemSlotCard
        item={{
          name: 'Denim Jacket',
          isOnShoppingList: true,
        }}
        onClick={() => console.log('View item')}
      />
    </div>
  );
}
