import { useEffect } from "react";
import "./Landing.css";

export default function Landing() {
    useEffect(() => {
        const elements = document.querySelectorAll(".reveal");

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("active");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="landing_page">
            <nav className="landing_nav">
                <div className="landing_logo">
                    <img src="/logo.png" alt="Maze Studio logo" />
                    <span>Maze Studio</span>
                </div>

                <div className="landing_nav_buttons">
                    <a href="/login" className="btn_secondary">Login</a>
                    <a href="/register" className="btn_primary">Sign up</a>
                </div>
            </nav>

            <section className="landing_hero reveal">
                <div className="landing_hero_text">
                    <span className="landing_badge">Built for Private Educators</span>

                    <h1>Stop teaching with five disconnected tools.</h1>

                    <p>
                        Maze Studio brings your learning journeys, learners, practice tasks,
                        progress tracking, resources and payments into one flexible platform
                        designed for private educators.
                    </p>

                    <div className="landing_actions">
                        <a href="/register" className="btn_primary">Start for $5/month</a>
                        <a href="/login" className="btn_secondary">Login</a>
                    </div>
                </div>

                <div className="landing_hero_card">
                    <h3>Journey Builder</h3>
                    <p>“Create a Spanish A1–C1 learning journey and adapt it for every learner.”</p>

                    <div className="fake_task">
                        <strong>AI Copilot</strong>
                        <span>Generate stages, lessons and practices from scratch.</span>
                    </div>

                    <div className="fake_task">
                        <strong>Import Existing Material</strong>
                        <span>Turn PDFs, slides and documents into editable learning blocks.</span>
                    </div>

                    <div className="fake_task">
                        <strong>Personalized Learner Paths</strong>
                        <span>Reuse one method while each learner follows their own route.</span>
                    </div>
                </div>
            </section>

            <section className="tools_problem reveal">
                <div className="section_header">
                    <span className="landing_badge">The Problem</span>
                    <h2>Your teaching workflow is probably scattered.</h2>
                    <p>
                        Most private educators manage lessons, communication, files, assignments,
                        progress and payments across multiple tools that were never designed to work together.
                    </p>
                </div>

                <div className="tools_comparison">
                    <div className="tool_stack">
                        <h3>Before Maze Studio</h3>

                        <div className="tool_item">
                            <i className="fa-brands fa-whatsapp"></i>
                            <div>
                                <strong>WhatsApp</strong>
                                <span>Messages and reminders</span>
                            </div>
                        </div>

                        <div className="tool_item">
                            <i className="fa-brands fa-google-drive"></i>
                            <div>
                                <strong>Google Drive</strong>
                                <span>PDFs, slides and resources</span>
                            </div>
                        </div>

                        <div className="tool_item">
                            <i className="fa-solid fa-table"></i>
                            <div>
                                <strong>Spreadsheets</strong>
                                <span>Payments and learner progress</span>
                            </div>
                        </div>

                        <div className="tool_item">
                            <i className="fa-solid fa-chalkboard"></i>
                            <div>
                                <strong>Classroom tools</strong>
                                <span>Basic assignments for groups</span>
                            </div>
                        </div>

                        <div className="tool_item">
                            <i className="fa-solid fa-credit-card"></i>
                            <div>
                                <strong>Payment apps</strong>
                                <span>Manual tracking and follow-ups</span>
                            </div>
                        </div>
                    </div>

                    <div className="maze_stack">
                        <span className="landing_badge">After</span>
                        <h3>Everything lives inside one Learning Journey.</h3>

                        <div className="maze_grid">
                            <div>Learning Journeys</div>
                            <div>Stages & Lessons</div>
                            <div>Practice Tasks</div>
                            <div>Learner Progress</div>
                            <div>Resources</div>
                            <div>Payments</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing_demo reveal">
                <div className="landing_demo_header">
                    <span className="landing_badge">Platform Walkthrough</span>

                    <h2>See how Maze Studio works in practice</h2>

                    <p>
                        Discover how to build learning journeys, organize stages and lessons,
                        assign personalized practice work, and track every learner's progress
                        from a single dashboard.
                    </p>
                </div>

                <div className="landing_video_container">
                    <iframe
                        loading="lazy"
                        src="https://www.youtube.com/embed/-CWzAd7Nq5U?start=3"
                        title="Maze Studio Demo"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    />
                </div>

                <div className="demo_highlights">
                    <div className="demo_item">
                        <i className="fa-solid fa-route"></i>
                        <span>Create learning journeys</span>
                    </div>

                    <div className="demo_item">
                        <i className="fa-solid fa-file-import"></i>
                        <span>Import existing material</span>
                    </div>

                    <div className="demo_item">
                        <i className="fa-solid fa-user-graduate"></i>
                        <span>Personalize learner paths</span>
                    </div>

                    <div className="demo_item">
                        <i className="fa-solid fa-chart-line"></i>
                        <span>Track progress</span>
                    </div>
                </div>
            </section>

            <section className="landing_features reveal">
                <div className="feature_card">
                    <i className="fa-solid fa-route"></i>
                    <h3>Learning journeys</h3>
                    <p>
                        Replace rigid classrooms with flexible journeys that represent your
                        real teaching method.
                    </p>
                </div>

                <div className="feature_card">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    <h3>AI Copilot</h3>
                    <p>
                        Generate stages, lessons, practices and learning structures from a simple prompt.
                    </p>
                </div>

                <div className="feature_card">
                    <i className="fa-solid fa-file-import"></i>
                    <h3>Import material</h3>
                    <p>
                        Turn PDFs, presentations and documents into editable learning blocks.
                    </p>
                </div>

                <div className="feature_card">
                    <i className="fa-solid fa-user-graduate"></i>
                    <h3>Learner paths</h3>
                    <p>
                        Let every learner follow a different route without duplicating your content.
                    </p>
                </div>

                <div className="feature_card">
                    <i className="fa-solid fa-clipboard-check"></i>
                    <h3>Practice tasks</h3>
                    <p>
                        Assign practice to one learner, selected learners or an entire journey.
                    </p>
                </div>

                <div className="feature_card">
                    <i className="fa-solid fa-link"></i>
                    <h3>Unique access links</h3>
                    <p>
                        Share lessons and activities with or without requiring a full account.
                    </p>
                </div>
            </section>

            <section className="difference_section reveal">
                <div className="section_header">
                    <span className="landing_badge">Why Maze Studio</span>
                    <h2>Not another LMS. A studio for private educators.</h2>
                    <p>
                        Maze Studio is not built around fixed courses. It is built around
                        reusable teaching methods that can be personalized for every learner.
                    </p>
                </div>

                <div className="difference_grid">
                    <div className="difference_card">
                        <h3>One method, many paths</h3>
                        <p>
                            Create one learning journey and adapt what each learner can see,
                            practice and complete.
                        </p>
                    </div>

                    <div className="difference_card">
                        <h3>Designed for 1:1 teaching</h3>
                        <p>
                            Manage private learners, individual progress, personal tasks and
                            custom goals without creating multiple classrooms.
                        </p>
                    </div>

                    <div className="difference_card">
                        <h3>Ready for future marketplace</h3>
                        <p>
                            Start privately today and later publish selected journeys as public
                            courses for extra revenue.
                        </p>
                    </div>
                </div>
            </section>

            <section className="comparison_section reveal">
                <div className="section_header">
                    <span className="landing_badge">Competitive Advantage</span>
                    <h2>Built for what traditional platforms miss.</h2>
                </div>

                <div className="comparison_table">
                    <div className="comparison_row comparison_head">
                        <span>Capability</span>
                        <span>Maze Studio</span>
                        <span>Google Classroom</span>
                        <span>Canvas LMS</span>
                        <span>Udemy</span>
                    </div>

                    <div className="comparison_row">
                        <span>Personalized learner paths</span>
                        <span><span className="status best">Included</span></span>
                        <span><span className="status partial">Basic</span></span>
                        <span><span className="status partial">Advanced setup</span></span>
                        <span><span className="status no">Not available</span></span>
                    </div>

                    <div className="comparison_row">
                        <span>Private educator focus</span>
                        <span><span className="status best">Included</span></span>
                        <span><span className="status partial">Basic</span></span>
                        <span><span className="status no">Not designed for it</span></span>
                        <span><span className="status no">Marketplace first</span></span>
                    </div>

                    <div className="comparison_row">
                        <span>Reusable teaching methods</span>
                        <span><span className="status best">Included</span></span>
                        <span><span className="status no">Not available</span></span>
                        <span><span className="status partial">Basic</span></span>
                        <span><span className="status no">Course fixed</span></span>
                    </div>

                    <div className="comparison_row">
                        <span>Import existing material</span>
                        <span><span className="status best">AI import</span></span>
                        <span><span className="status partial">File upload</span></span>
                        <span><span className="status partial">File upload</span></span>
                        <span><span className="status partial">Manual upload</span></span>
                    </div>

                    <div className="comparison_row">
                        <span>Practice per learner</span>
                        <span><span className="status best">Included</span></span>
                        <span><span className="status partial">Group based</span></span>
                        <span><span className="status partial">Complex setup</span></span>
                        <span><span className="status no">Not available</span></span>
                    </div>

                    <div className="comparison_row">
                        <span>Payments for educators</span>
                        <span><span className="status best">Planned</span></span>
                        <span><span className="status no">Not available</span></span>
                        <span><span className="status no">Not available</span></span>
                        <span><span className="status partial">Marketplace only</span></span>
                    </div>
                </div>
            </section>

            <section className="landing_cta ">
                <h2>Your teaching method deserves more than chats, folders and spreadsheets.</h2>
                <p>
                    Create learning journeys, personalize every learner path, import your existing
                    material and manage your entire private teaching workflow from one place.
                </p>
                <a href="/register" className="btn_primary">Start for $5/month</a>
            </section>

            <footer className="landing_footer">
                <span>Maze Studio © 2026</span>
            </footer>
        </div>
    );
}