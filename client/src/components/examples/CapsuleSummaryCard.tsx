import CapsuleSummaryCard from '../CapsuleSummaryCard';

export default function CapsuleSummaryCardExample() {
  return (
    <div className="p-6">
      <CapsuleSummaryCard
        capsule={{
          id: '1',
          name: 'Spring 2025',
          itemCount: 12,
          lastUpdated: 'today',
          previewImages: [],
        }}
        onClick={() => console.log('Open capsule')}
      />
    </div>
  );
}
