interface Props {
  step: number;
  total: number;
}

export default function OnboardingProgress({ step, total }: Props) {
  return (
    <div className="flex gap-1.5 justify-center mb-8" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < step ? "w-8 bg-night-teal" : "w-4 bg-sand-dark"
          }`}
        />
      ))}
    </div>
  );
}
