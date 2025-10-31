import CapsuleBuilder from '../CapsuleBuilder';

export default function CapsuleBuilderExample() {
  const mockCategories = [
    {
      name: 'Tops',
      maxItems: 10,
      items: [
        { id: '1', name: 'White T-Shirt', isOnShoppingList: false },
        { id: '2', name: 'Blue Shirt', isOnShoppingList: true },
        null,
        null,
      ],
    },
    {
      name: 'Bottoms',
      maxItems: 6,
      items: [
        { id: '3', name: 'Jeans', isOnShoppingList: false },
        null,
        null,
      ],
    },
  ];

  return (
    <CapsuleBuilder
      capsuleName="Spring 2025"
      categories={mockCategories}
      onAddItem={(cat) => console.log('Add item to', cat)}
      onViewItem={(item) => console.log('View item', item)}
      onAddSlot={(cat) => console.log('Add slot to', cat)}
      onRemoveSlot={(cat) => console.log('Remove slot from', cat)}
    />
  );
}
