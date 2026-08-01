import { useCallback, useEffect, useState } from "react";
import { getMyEnrollments } from "../api/enrollmentApi";

export default function useEnrollments() {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getMyEnrollments();
            setEnrollments(Array.isArray(data) ? data : []);
        } catch (requestError) {
            setError(
                requestError.message ||
                    "Could not load your Learning Journeys."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        getMyEnrollments()
            .then((data) => {
                if (active) {
                    setEnrollments(Array.isArray(data) ? data : []);
                }
            })
            .catch((requestError) => {
                if (active) {
                    setError(
                        requestError.message ||
                            "Could not load your Learning Journeys."
                    );
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    return { enrollments, loading, error, reload };
}
