import ShoppingList from '../ShoppingList';

export default function ShoppingListExample() {
  const mockItems = [
    {
      id: '1',
      name: 'White T-Shirt',
      productLink: 'https://example.com/product1',
      capsuleName: 'Spring 2025',
    },
    {
      id: '2',
      name: 'Denim Jacket',
      productLink: 'https://example.com/product2',
      capsuleName: 'Spring 2025',
    },
  ];

  return (
    <ShoppingList
      items={mockItems}
      onRemove={(id) => console.log('Remove item', id)}
      onOpenLink={(link) => console.log('Open link', link)}
    />
  );
}
