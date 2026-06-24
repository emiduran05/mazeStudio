import "./Register.css";

export default function Register() {
    return (
        <div className="register_page">
            <div className="register_left">
                <nav className="register_nav">
                    <div className="register_logo">
                        <img src="/logo.png" alt="Maze Studio logo" />
                        <span>Maze Studio</span>
                    </div>

                    <a href="/" className="btn_secondary">Back home</a>
                </nav>

                <div className="register_content">
                    <span className="landing_badge">Start your studio</span>

                    <h1>Create your Maze Studio account.</h1>

                    <p>
                        Choose how you want to use Maze Studio. Educators can create learning
                        journeys and manage learners, while learners can access lessons,
                        assignments and progress for free.
                    </p>

                    <form className="register_form">
                        <div className="account_type_grid">
                            <label className="account_type_card">
                                <input type="radio" name="role" value="EDUCATOR" defaultChecked />
                                <div>
                                    <i className="fa-solid fa-chalkboard-user"></i>
                                    <strong>Educator</strong>
                                    <span>
                                        $5/month · Create learning journeys, manage learners,
                                        assign practice work and track progress.
                                    </span>
                                </div>
                            </label>

                            <label className="account_type_card">
                                <input type="radio" name="role" value="STUDENT" />
                                <div>
                                    <i className="fa-solid fa-user-graduate"></i>
                                    <strong>Learner</strong>
                                    <span>
                                        Free · Access lessons, submit assignments and follow
                                        your personal learning progress.
                                    </span>
                                </div>
                            </label>
                        </div>

                        <div className="form_grid">
                            <div className="form_group">
                                <label>First name</label>
                                <input type="text" placeholder="Maria" />
                            </div>

                            <div className="form_group">
                                <label>Last name</label>
                                <input type="text" placeholder="Lopez" />
                            </div>
                        </div>

                        <div className="form_group">
                            <label>Email address</label>
                            <input type="email" placeholder="teacher@example.com" />
                        </div>

                        <div className="form_group">
                            <label>Teaching or learning area</label>
                            <select defaultValue="">
                                <option value="" disabled>Select your main area</option>
                                <option>Languages</option>
                                <option>Math</option>
                                <option>Science</option>
                                <option>Music</option>
                                <option>Programming</option>
                                <option>Test preparation</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div className="form_grid">
                            <div className="form_group">
                                <label>Password</label>
                                <input type="password" placeholder="Create a password" />
                            </div>

                            <div className="form_group">
                                <label>Confirm password</label>
                                <input type="password" placeholder="Repeat password" />
                            </div>
                        </div>

                        <label className="terms">
                            <input type="checkbox" />
                            <span>
                                I agree to the <a href="/terms">Terms</a> and{" "}
                                <a href="/privacy">Privacy Policy</a>.
                            </span>
                        </label>

                        <button type="button" className="btn_primary register_button">
                            Create account
                        </button>
                    </form>

                    <p className="register_footer_text">
                        Already have an account? <a href="/login">Login</a>
                    </p>
                </div>
            </div>

            <div className="register_right">
                <div className="register_preview_card">
                    <div className="preview_badge">Choose your workspace</div>

                    <h2>Educator or Learner</h2>

                    <p>
                        Maze Studio adapts to your role. Educators build and monetize
                        learning journeys. Learners join, learn and track their progress.
                    </p>

                    <div className="journey_steps">
                        <div className="journey_step active">
                            <span>01</span>
                            <div>
                                <strong>Educator account</strong>
                                <small>$5/month to create journeys, lessons, assignments and manage learners.</small>
                            </div>
                        </div>

                        <div className="journey_step">
                            <span>02</span>
                            <div>
                                <strong>Learner account</strong>
                                <small>Free access to lessons, tasks, feedback and personal progress.</small>
                            </div>
                        </div>

                        <div className="journey_step">
                            <span>03</span>
                            <div>
                                <strong>Secure access links</strong>
                                <small> Learners can join with an account or through unique shared links.</small>
                            </div>
                        </div>

                        <div className="journey_step">
                            <span>04</span>
                            <div>
                                <strong>Scalable learning</strong>
                                <small>Start with private teaching and grow into groups or institutions.</small>
                            </div>
                        </div>
                    </div>

                    <div className="register_stats">
                        <div>
                            <strong>$5</strong>
                            <span>Educator plan</span>
                        </div>

                        <div>
                            <strong>Free</strong>
                            <span>Learner access</span>
                        </div>

                        <div>
                            <strong>∞</strong>
                            <span>Journeys</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}