import { useEffect, useState } from "react";
import { apiRequest } from "../../../../../api/api";
import JourneyCohorts from "./JourneyCohorts";
import "./JourneyCohortsGuide.css";

export default function JourneyCohortsPage({ journeyId }) {
    const [offerings, setOfferings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiRequest(`/learning-journeys/${journeyId}/offerings`)
            .then((data) => setOfferings(data.offerings || []))
            .finally(() => setLoading(false));
    }, [journeyId]);

    if (loading) return <div className="builder_empty_state">Loading cohorts...</div>;
    const guide = <section className="cohort_guide"><header><div><span>Student groups</span><h2>What is a Cohort?</h2><p>A Cohort is one group of learners taking the same live version of this course together.</p></div><i className="fa-solid fa-people-group"/></header><div><article><b>1</b><span><strong>Offer</strong><small>Defines what you sell: group course, hybrid course or webinar.</small></span></article><i className="fa-solid fa-arrow-right"/><article><b>2</b><span><strong>Cohort</strong><small>Defines who attends, capacity, enrollment dates and the specific group.</small></span></article><i className="fa-solid fa-arrow-right"/><article><b>3</b><span><strong>Sessions</strong><small>Defines when that group meets and adds every class to their calendars.</small></span></article></div><footer><i className="fa-solid fa-circle-info"/><p>You do not need Cohorts for self-paced courses or private 1:1 classes. Use them when multiple students share the same live schedule.</p></footer></section>;
    if (!offerings.some((item) => ["COHORT", "HYBRID", "WEBINAR"].includes(item.offering_type))) {
        return (<>{guide}
            <div className="builder_empty_state">
                <div className="builder_empty_icon"><i className="fa-solid fa-people-roof" /></div>
                <h2>Create a Group, Webinar or Hybrid offer first</h2>
                <p>Groups belong to a sellable Offer so dates, capacity, and access remain connected.</p>
            </div></>);
    }
    return <>{guide}<JourneyCohorts offerings={offerings} /></>;
}
