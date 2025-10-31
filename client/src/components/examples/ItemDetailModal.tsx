import ItemDetailModal from '../ItemDetailModal';

export default function ItemDetailModalExample() {
  return (
    <ItemDetailModal
      item={{
        name: 'White T-Shirt',
        description: 'Classic cotton t-shirt',
        productLink: 'https://example.com/product',
        isOnShoppingList: false,
      }}
      onClose={() => console.log('Close modal')}
      onSave={(data) => console.log('Save item', data)}
      onDelete={() => console.log('Delete item')}
    />
  );
}
