import OutfitGenerator from '../OutfitGenerator';

export default function OutfitGeneratorExample() {
  const mockGenerate = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return [
      {
        id: '1',
        name: 'Casual Weekend',
        occasion: 'Perfect for brunch or shopping',
        items: ['White T-Shirt', 'Blue Jeans', 'Sneakers', 'Denim Jacket'],
      },
      {
        id: '2',
        name: 'Smart Casual',
        occasion: 'Great for dinner or a date',
        items: ['Navy Blazer', 'White Shirt', 'Chinos', 'Loafers'],
      },
    ];
  };

  return <OutfitGenerator onGenerate={mockGenerate} />;
}
