import ReviewCard from '../ReviewCard';

export default function ReviewCardExample() {
  return (
    <div className="max-w-2xl">
      <ReviewCard
        id="review1"
        reviewerName="Sarah Johnson"
        rating={5}
        comment="Amazing experience! The crowd forecast was accurate and helped us plan our visit perfectly. Highly recommend using this platform."
        blockchainHash="0x7a3f9c2e1d8b6f4a5c9e2d1b8f6a3c9e2d1b8f6a"
        verified={true}
      />
    </div>
  );
}
