import AttractionCard from '../AttractionCard';
import eiffelImage from '@assets/generated_images/Eiffel_Tower_attraction_photo_976726da.png';

export default function AttractionCardExample() {
  return (
    <div className="max-w-sm">
      <AttractionCard
        id="eiffel"
        name="Eiffel Tower"
        location="Paris, France"
        image={eiffelImage}
        crowdLevel="moderate"
        visitorCount={12500}
      />
    </div>
  );
}
