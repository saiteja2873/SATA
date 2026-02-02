import EventCard from '../EventCard';
import festivalImage from '@assets/generated_images/Japanese_cultural_festival_270ba439.png';

export default function EventCardExample() {
  return (
    <div className="max-w-sm">
      <EventCard
        id="festival"
        name="Cherry Blossom Festival"
        date="April 15-20, 2025"
        city="Tokyo, Japan"
        image={festivalImage}
        tags={["Cultural", "Festival", "Traditional"]}
        aiRecommended={true}
      />
    </div>
  );
}
