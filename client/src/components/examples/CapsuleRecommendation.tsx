import CapsuleRecommendation from '../CapsuleRecommendation';

export default function CapsuleRecommendationExample() {
  const mockRecommendation = {
    fabrics: ['Cotton', 'Linen', 'Denim', 'Silk'],
    colors: ['Navy', 'White', 'Beige', 'Olive', 'Black'],
    structure: {
      type: 'Seasonal Capsule',
      total: 30,
      breakdown: [
        { category: 'Tops', count: 10 },
        { category: 'Bottoms', count: 6 },
        { category: 'Outerwear', count: 4 },
        { category: 'Shoes', count: 4 },
        { category: 'Accessories', count: 4 },
        { category: 'Miscellaneous', count: 2 },
      ],
    },
  };

  return (
    <CapsuleRecommendation
      recommendation={mockRecommendation}
      onCreateCapsule={() => console.log('Create capsule')}
    />
  );
}
