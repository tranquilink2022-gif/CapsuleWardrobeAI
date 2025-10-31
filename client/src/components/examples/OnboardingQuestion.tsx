import { useState } from 'react';
import OnboardingQuestion from '../OnboardingQuestion';

export default function OnboardingQuestionExample() {
  const [selected, setSelected] = useState<string>();
  
  return (
    <OnboardingQuestion
      question="What season are you planning for?"
      options={['Spring', 'Summer', 'Fall', 'Winter']}
      selectedOption={selected}
      onSelect={setSelected}
      onBack={() => console.log('Go back')}
      step={1}
      totalSteps={4}
    />
  );
}
