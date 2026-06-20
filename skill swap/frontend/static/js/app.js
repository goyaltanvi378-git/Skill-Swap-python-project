// SkillSwap Single Page Application (SPA) Engine
const App = {
    state: {
        token: localStorage.getItem('skillswap_token') || null,
        user: null,
        currentRoute: '#landing',
        matches: [],
        activeChatUser: null,
        chatPollInterval: null,
        messages: []
    },

    init() {
        console.log("Initializing SkillSwap Frontend...");
        
        // Event Listeners for Hash Routing
        window.addEventListener('hashchange', () => this.handleRouting());
        
        // Register Sidebar toggle click for mobile responsive layout
        document.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.sidebar');
            const toggleBtn = document.getElementById('sidebarToggle');
            if (toggleBtn && (toggleBtn.contains(e.target) || e.target.id === 'sidebarToggle')) {
                sidebar.classList.toggle('show');
            } else if (sidebar && sidebar.classList.contains('show') && !sidebar.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });

        // Initialize session and route
        this.checkAuth().then(() => {
            this.handleRouting();
        });
    },

    // API Request Wrapper helper
    async api(endpoint, method = 'GET', data = null) {
        const headers = {};
        if (this.state.token) {
            headers['Authorization'] = `Bearer ${this.state.token}`;
        }
        if (data) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            method,
            headers,
            body: data ? JSON.stringify(data) : null
        };

        try {
            const response = await fetch(endpoint, config);
            if (response.status === 401) {
                // Token expired or invalid, log out
                this.logout();
                throw new Error("Session expired. Please log in again.");
            }
            const resData = await response.json();
            if (!response.ok) {
                throw new Error(resData.detail || "Something went wrong.");
            }
            return resData;
        } catch (error) {
            console.error("API Error:", error);
            this.showToast(error.message, true);
            throw error;
        }
    },

    // Check user session from current token
    async checkAuth() {
        if (!this.state.token) {
            this.state.user = null;
            return;
        }
        try {
            const user = await this.api('/api/me');
            this.state.user = user;
        } catch (err) {
            this.state.token = null;
            this.state.user = null;
            localStorage.removeItem('skillswap_token');
        }
    },

    // Handle hash routing
    handleRouting() {
        // Clear chat polling when changing routes
        if (this.state.chatPollInterval) {
            clearInterval(this.state.chatPollInterval);
            this.state.chatPollInterval = null;
        }

        let hash = window.location.hash || '#landing';
        this.state.currentRoute = hash;

        // Route Guarding
        const authRoutes = ['#dashboard', '#add-skills', '#my-skills', '#matches', '#messages', '#profile', '#settings'];
        if (authRoutes.includes(hash) && !this.state.token) {
            window.location.hash = '#login';
            return;
        }
        if (['#login', '#register', '#landing'].includes(hash) && this.state.token) {
            window.location.hash = '#dashboard';
            return;
        }

        // Render page views
        if (hash === '#landing') {
            this.renderLanding();
        } else if (hash === '#login') {
            this.renderLogin();
        } else if (hash === '#register') {
            this.renderRegister();
        } else {
            // Logged-in page layout wrapper (Sidebar + Content)
            this.renderAppShell(() => {
                if (hash === '#dashboard') this.renderDashboard();
                else if (hash === '#add-skills' || hash === '#my-skills') this.renderSkills();
                else if (hash === '#matches') this.renderMatches();
                else if (hash === '#messages') this.renderMessages();
                else if (hash.startsWith('#profile')) {
                    const parts = hash.split('/');
                    const userId = parts.length > 1 ? parseInt(parts[1]) : this.state.user.id;
                    this.renderProfile(userId);
                }
                else if (hash === '#settings') this.renderSettings();
            });
        }
    },

    // Render toast message
    showToast(message, isError = false) {
        const toastEl = document.getElementById('appToast');
        const toastMsg = document.getElementById('toastMessage');
        if (!toastEl) return;

        toastMsg.innerText = message;
        toastEl.className = `toast align-items-center border-0 text-white ${isError ? 'bg-danger' : 'bg-success'}`;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    },

    // Global Login action
    async login(email, password) {
        try {
            const data = await this.api('/api/login', 'POST', { email, password });
            this.state.token = data.access_token;
            this.state.user = data.user;
            localStorage.setItem('skillswap_token', data.access_token);
            this.showToast(`Welcome back, ${data.user.name}!`);
            window.location.hash = '#dashboard';
        } catch (err) {
            // error already handled by API wrapper
        }
    },

    // Global Register action
    async register(name, email, password, college, branch, year, bio) {
        try {
            const payload = { name, email, password, college, branch, year, bio };
            const data = await this.api('/api/register', 'POST', payload);
            this.state.token = data.access_token;
            this.state.user = data.user;
            localStorage.setItem('skillswap_token', data.access_token);
            this.showToast(`Registration Successful! Welcome ${data.user.name}`);
            window.location.hash = '#dashboard';
        } catch (err) {
            // error already handled
        }
    },

    // Global Logout action
    logout() {
        this.state.token = null;
        this.state.user = null;
        localStorage.removeItem('skillswap_token');
        window.location.hash = '#landing';
        this.showToast("Logged out successfully");
    },

    // View Renders

    // Landing Page
    renderLanding() {
        document.getElementById('sidebarToggle').style.display = 'none';
        const viewport = document.getElementById('appViewport');
        viewport.innerHTML = `
            <!-- Landing Nav -->
            <nav class="navbar navbar-expand-lg landing-nav bg-white py-3">
                <div class="container">
                    <a class="landing-logo" href="#landing">
                        <i class="bi bi-arrow-left-right"></i>
                        <span>SkillSwap</span>
                    </a>
                    <div class="d-flex gap-3">
                        <a href="#login" class="btn btn-outline-primary px-4 rounded-pill">Login</a>
                        <a href="#register" class="btn btn-primary px-4 rounded-pill">Get Started</a>
                    </div>
                </div>
            </nav>

            <!-- Hero Section -->
            <section class="landing-hero d-flex align-items-center">
                <div class="container text-center">
                    <div class="row justify-content-center">
                        <div class="col-md-9">
                            <span class="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill mb-3">No money. Just Knowledge Exchange.</span>
                            <h1 class="display-4 fw-extrabold mb-4" style="font-family: 'Outfit'; font-size: 56px; line-height: 1.1;">Exchange Skills.<br><span class="text-primary">Grow Together.</span></h1>
                            <p class="lead text-muted mb-5 fs-5">Teach what you know. Learn what you don't. Join a network of college students exchanging expertise dynamically without spending a dime.</p>
                            <div class="d-flex justify-content-center gap-3">
                                <a href="#register" class="btn btn-primary btn-lg px-5 py-3 rounded-pill shadow-lg">Get Started Now</a>
                                <a href="#login" class="btn btn-outline-dark btn-lg px-5 py-3 rounded-pill">Find Matches</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Feature Cards Section -->
            <section class="py-5 bg-white">
                <div class="container">
                    <div class="text-center mb-5">
                        <h2 class="fw-bold" style="font-size: 36px;">How SkillSwap Works</h2>
                        <p class="text-muted">Simple, direct, and focused on peer-to-peer growth</p>
                    </div>
                    <div class="row g-4">
                        <div class="col-md-3">
                            <div class="card h-100 border-0 shadow-sm p-4 feature-card rounded-4">
                                <div class="feature-icon"><i class="bi bi-share"></i></div>
                                <h5 class="fw-bold">Share Skills</h5>
                                <p class="text-muted small">List the technical or soft skills you excel at and are willing to teach peers.</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card h-100 border-0 shadow-sm p-4 feature-card rounded-4">
                                <div class="feature-icon"><i class="bi bi-search"></i></div>
                                <h5 class="fw-bold">Find Matches</h5>
                                <p class="text-muted small">Our algorithm automatically pairs you with students who want what you offer and offer what you want.</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card h-100 border-0 shadow-sm p-4 feature-card rounded-4">
                                <div class="feature-icon"><i class="bi bi-lightning-charge"></i></div>
                                <h5 class="fw-bold">Learn Faster</h5>
                                <p class="text-muted small">Coordinate mutual study times via direct chat and level up your skills quickly.</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card h-100 border-0 shadow-sm p-4 feature-card rounded-4">
                                <div class="feature-icon"><i class="bi bi-people"></i></div>
                                <h5 class="fw-bold">Build Network</h5>
                                <p class="text-muted small">Meet talented developers, designers, and students across campuses to expand your circle.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    },

    // Login Page
    renderLogin() {
        document.getElementById('sidebarToggle').style.display = 'none';
        const viewport = document.getElementById('appViewport');
        viewport.innerHTML = `
            <div class="auth-page-container">
                <div class="card border-0 auth-card glass-card">
                    <div class="text-center mb-4">
                        <a class="landing-logo justify-content-center mb-3 text-decoration-none" href="#landing">
                            <i class="bi bi-arrow-left-right"></i>
                            <span>SkillSwap</span>
                        </a>
                        <h4 class="fw-bold">Welcome Back</h4>
                        <p class="text-muted">Enter credentials to access your exchange network</p>
                    </div>
                    <form id="loginForm">
                        <div class="mb-3">
                            <label class="form-label small fw-bold">College Email</label>
                            <input type="email" class="form-control rounded-3 p-3" id="loginEmail" placeholder="name@college.edu" required>
                        </div>
                        <div class="mb-4">
                            <label class="form-label small fw-bold">Password</label>
                            <input type="password" class="form-control rounded-3 p-3" id="loginPassword" placeholder="••••••••" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 p-3 rounded-3 fw-bold mb-3">Sign In</button>
                        <p class="text-center text-muted small mb-0">Don't have an account? <a href="#register" class="fw-bold text-decoration-none text-primary">Register Here</a></p>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPassword').value;
            this.login(email, pass);
        });
    },

    // Register Page
    renderRegister() {
        document.getElementById('sidebarToggle').style.display = 'none';
        const viewport = document.getElementById('appViewport');
        viewport.innerHTML = `
            <div class="auth-page-container">
                <div class="card border-0 auth-card glass-card my-4" style="max-width: 580px;">
                    <div class="text-center mb-4">
                        <a class="landing-logo justify-content-center mb-3 text-decoration-none" href="#landing">
                            <i class="bi bi-arrow-left-right"></i>
                            <span>SkillSwap</span>
                        </a>
                        <h4 class="fw-bold">Create Student Account</h4>
                        <p class="text-muted">Exchange knowledge, build project portfolios</p>
                    </div>
                    <form id="registerForm">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label small fw-bold">Full Name</label>
                                <input type="text" class="form-control rounded-3 p-3" id="regName" placeholder="Aditya Kumar" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label small fw-bold">College Email</label>
                                <input type="email" class="form-control rounded-3 p-3" id="regEmail" placeholder="aditya@college.edu" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label small fw-bold">College/University</label>
                                <input type="text" class="form-control rounded-3 p-3" id="regCollege" placeholder="DTU Delhi" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label small fw-bold">Branch/Major</label>
                                <input type="text" class="form-control rounded-3 p-3" id="regBranch" placeholder="Computer Engineering" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label small fw-bold">Year of Study</label>
                                <select class="form-select rounded-3 p-3" id="regYear" required>
                                    <option value="1st Year">1st Year</option>
                                    <option value="2nd Year">2nd Year</option>
                                    <option value="3rd Year" selected>3rd Year</option>
                                    <option value="4th Year">4th Year</option>
                                </select>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label small fw-bold">Password</label>
                                <input type="password" class="form-control rounded-3 p-3" id="regPassword" placeholder="••••••••" required>
                            </div>
                        </div>
                        <div class="mb-4">
                            <label class="form-label small fw-bold">Short Bio</label>
                            <textarea class="form-control rounded-3 p-3" id="regBio" rows="2" placeholder="Tell us what you build or want to exchange..." required></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 p-3 rounded-3 fw-bold mb-3">Register Now</button>
                        <p class="text-center text-muted small mb-0">Already registered? <a href="#login" class="fw-bold text-decoration-none text-primary">Login Here</a></p>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const college = document.getElementById('regCollege').value;
            const branch = document.getElementById('regBranch').value;
            const year = document.getElementById('regYear').value;
            const pass = document.getElementById('regPassword').value;
            const bio = document.getElementById('regBio').value;
            this.register(name, email, pass, college, branch, year, bio);
        });
    },

    // App Shell Layout (Sidebar Navigation menu wrapper)
    renderAppShell(renderContentCallback) {
        document.getElementById('sidebarToggle').style.display = 'flex';
        const viewport = document.getElementById('appViewport');

        // Render Shell structure only if it doesn't exist
        if (!document.getElementById('appMainContentWrapper')) {
            const unreadCount = 3; // seeded count or state
            viewport.innerHTML = `
                <div class="app-container">
                    <!-- Sidebar Navigation -->
                    <aside class="sidebar">
                        <div class="sidebar-logo">
                            <i class="bi bi-arrow-left-right"></i>
                            <span>Student Skill<br><small class="text-muted fw-normal" style="font-size: 12px;">Exchange Network</small></span>
                        </div>
                        <nav class="sidebar-nav">
                            <a href="#dashboard" class="nav-item" id="nav-dashboard"><i class="bi bi-grid-fill"></i>Dashboard</a>
                            <a href="#add-skills" class="nav-item" id="nav-add-skills"><i class="bi bi-plus-circle-fill"></i>Add Skills</a>
                            <a href="#my-skills" class="nav-item" id="nav-my-skills"><i class="bi bi-bookmark-star-fill"></i>My Skills</a>
                            <a href="#matches" class="nav-item" id="nav-matches"><i class="bi bi-people-fill"></i>My Matches</a>
                            <a href="#messages" class="nav-item" id="nav-messages">
                                <i class="bi bi-chat-left-dots-fill"></i>Messages
                                <span class="badge-count" id="messages-badge">${unreadCount}</span>
                            </a>
                            <a href="#profile" class="nav-item" id="nav-profile"><i class="bi bi-person-bounding-box"></i>Profile</a>
                            <a href="#settings" class="nav-item" id="nav-settings"><i class="bi bi-gear-fill"></i>Settings</a>
                            
                            <button class="nav-item nav-item-logout" id="sidebarLogoutBtn"><i class="bi bi-box-arrow-left"></i>Logout</button>
                        </nav>
                    </aside>
                    <!-- Main Content Panel -->
                    <main class="main-wrapper" id="appMainContentWrapper">
                        <!-- Dynamic subviews will be rendered inside here -->
                    </main>
                </div>
            `;

            document.getElementById('sidebarLogoutBtn').addEventListener('click', () => this.logout());
        }

        // Set Active link in sidebar
        const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
        navLinks.forEach(link => link.classList.remove('active'));

        const currentRoot = this.state.currentRoute.split('/')[0];
        const activeLink = document.getElementById(`nav-${currentRoot.substring(1)}`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Call specific subpage renderer
        renderContentCallback();
    },

    // Sub views render functions

    // Dashboard view
    async renderDashboard() {
        const contentArea = document.getElementById('appMainContentWrapper');
        contentArea.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold mb-1">Welcome back, ${this.state.user.name} 👋</h2>
                    <p class="text-muted mb-0">Exchange skills. Learn together. Grow together.</p>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <div class="position-relative cursor-pointer" onclick="window.location.hash='#messages'">
                        <i class="bi bi-bell-fill fs-5 text-muted"></i>
                        <span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>
                    </div>
                    <img src="${this.state.user.profile_image}" class="rounded-circle border border-2 border-primary" style="width: 44px; height: 44px; background: #fff;" onclick="window.location.hash='#profile'">
                </div>
            </div>

            <!-- Stats Dashboard Row -->
            <div class="row g-4 mb-4">
                <div class="col-md-4">
                    <div class="card border-0 p-4 stat-card-1 glass-card">
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <span class="fw-semibold">Skills I Offer</span>
                            <i class="bi bi-upload fs-4"></i>
                        </div>
                        <h2 class="display-5 fw-bold" id="dashOfferedCount">0</h2>
                        <p class="small stat-card-info mb-0" id="dashOfferedList">No skills listed yet.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 p-4 stat-card-2 glass-card">
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <span class="fw-semibold">Skills I Want</span>
                            <i class="bi bi-download fs-4"></i>
                        </div>
                        <h2 class="display-5 fw-bold" id="dashWantedCount">0</h2>
                        <p class="small stat-card-info mb-0" id="dashWantedList">No skills listed yet.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 p-4 stat-card-3 glass-card">
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <span class="fw-semibold">Matches Found</span>
                            <i class="bi bi-arrow-left-right fs-4"></i>
                        </div>
                        <h2 class="display-5 fw-bold" id="dashMatchesCount">0</h2>
                        <p class="small stat-card-info mb-0" id="dashMatchesList">Add skills to calculate matches.</p>
                    </div>
                </div>
            </div>

            <!-- Main dashboard body -->
            <div class="row g-4 mb-4">
                <!-- Top Matches List -->
                <div class="col-lg-8">
                    <div class="card border-0 p-4 glass-card h-100">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h4 class="fw-bold mb-0">Top Matches for You</h4>
                            <a href="#matches" class="text-primary text-decoration-none fw-semibold small">View All</a>
                        </div>
                        <div class="row g-3" id="topMatchesList">
                            <div class="col-12 text-center py-4 text-muted">
                                <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                                <p class="small mb-0">Matching skills in background...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Call to Action Exchange Knowledge Banner -->
                <div class="col-lg-4">
                    <div class="card border-0 p-4 glass-card h-100 d-flex flex-column justify-content-between bg-primary-subtle" style="border: 1px solid rgba(37,99,235,0.15) !important;">
                        <div>
                            <h4 class="fw-bold text-primary mb-2">Exchange knowledge, not money.</h4>
                            <p class="text-muted small">Teach what you know. Learn what you don't. Connect with student experts from IIIT Delhi, NIT Trichy, VIT Pune, and DTU Delhi.</p>
                        </div>
                        <div class="mt-4">
                            <img src="https://api.dicebear.com/7.x/shapes/svg?seed=SkillSwap" class="img-fluid rounded-4 mb-3" style="max-height: 120px; width: 100%; object-fit: cover; opacity: 0.85;">
                            <a href="#matches" class="btn btn-primary w-100 rounded-3 py-2 fw-semibold">Explore Matches <i class="bi bi-arrow-right"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update counts
        const offered = this.state.user.skills.filter(s => s.type === 'offered');
        const wanted = this.state.user.skills.filter(s => s.type === 'wanted');
        
        document.getElementById('dashOfferedCount').innerText = offered.length;
        document.getElementById('dashOfferedList').innerText = offered.length > 0 ? offered.map(s => s.skill_name).join(', ') : 'Add skills to offer tutoring.';

        document.getElementById('dashWantedCount').innerText = wanted.length;
        document.getElementById('dashWantedList').innerText = wanted.length > 0 ? wanted.map(s => s.skill_name).join(', ') : 'Add skills you want to study.';

        // Load Matches count and matches cards
        try {
            const matches = await this.api('/api/matches');
            this.state.matches = matches;
            
            // Filter strictly mutual matches (score >= 80)
            const mutualMatches = matches.filter(m => m.match_score >= 80);
            document.getElementById('dashMatchesCount').innerText = mutualMatches.length;
            document.getElementById('dashMatchesList').innerText = mutualMatches.length > 0 ? `${mutualMatches.length} mutual matches available!` : 'No mutual matches yet.';

            const topMatchesContainer = document.getElementById('topMatchesList');
            if (matches.length === 0) {
                topMatchesContainer.innerHTML = `
                    <div class="col-12 text-center py-4 text-muted">
                        <i class="bi bi-search fs-3 mb-2 d-block"></i>
                        <p class="small mb-0">No matches found. Add more skills to get suggestions!</p>
                    </div>
                `;
                return;
            }

            // Take top 4 matches
            topMatchesContainer.innerHTML = '';
            matches.slice(0, 4).forEach(match => {
                // Determine connection text
                let connBtnClass = "btn-outline-primary";
                let connText = "Connect";
                if (match.status === 'pending') {
                    connBtnClass = "btn-secondary disabled";
                    connText = "Pending";
                } else if (match.status === 'connected') {
                    connBtnClass = "btn-success";
                    connText = "Message";
                }

                const cardHtml = `
                    <div class="col-md-6">
                        <div class="card border-0 p-3 shadow-sm rounded-4 h-100 bg-white glass-card-hover">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="${match.profile_image}" class="rounded-circle" style="width: 40px; height: 40px; border: 1px solid #eee;">
                                    <div class="min-width-0">
                                        <h6 class="fw-bold mb-0 text-truncate" style="font-size: 14px; max-width: 110px;">${match.name}</h6>
                                        <p class="text-muted mb-0 text-truncate" style="font-size: 11px; max-width: 110px;">${match.college}</p>
                                    </div>
                                </div>
                                <span class="badge text-success bg-success-subtle border border-success-subtle rounded-pill small">${match.match_score}% Match</span>
                            </div>
                            <div class="my-2">
                                <div class="mb-1"><strong class="small text-muted">Offers:</strong> ${match.skills_offered.slice(0, 2).map(s => `<span class="badge bg-success-subtle text-success small">${s}</span>`).join(' ') || '<span class="text-muted small">None</span>'}</div>
                                <div><strong class="small text-muted">Wants:</strong> ${match.skills_wanted.slice(0, 2).map(s => `<span class="badge bg-primary-subtle text-primary small">${s}</span>`).join(' ') || '<span class="text-muted small">None</span>'}</div>
                            </div>
                            <div class="d-flex gap-2 mt-2">
                                <button class="btn ${connBtnClass} btn-sm flex-grow-1 rounded-3" onclick="App.handleConnectClick(${match.id}, '${match.status}')">${connText}</button>
                                <a href="#profile/${match.id}" class="btn btn-light btn-sm rounded-3"><i class="bi bi-eye"></i></a>
                            </div>
                        </div>
                    </div>
                `;
                topMatchesContainer.innerHTML += cardHtml;
            });
        } catch (e) {
            console.error("Dashboard Matches load failed:", e);
        }
    },

    // Handling clicking Connect/Message from listings
    async handleConnectClick(userId, status) {
        if (status === 'connected') {
            window.location.hash = '#messages';
            // Set active chat user
            this.state.activeChatUser = userId;
        } else if (status === 'none') {
            try {
                const response = await this.api('/api/connect', 'POST', { user_id: userId });
                this.showToast(response.message);
                // Refresh routing
                this.checkAuth().then(() => this.handleRouting());
            } catch (err) {}
        }
    },

    // Skills Page (Add Skills and My Skills consolidated UI)
    renderSkills() {
        const contentArea = document.getElementById('appMainContentWrapper');
        contentArea.innerHTML = `
            <div class="mb-4">
                <h2 class="fw-bold mb-1">Add Your Skills</h2>
                <p class="text-muted">Manage the skills you can offer to teach and the skills you want to learn.</p>
            </div>

            <div class="row g-4">
                <!-- Skills Input Forms -->
                <div class="col-lg-8">
                    <div class="card border-0 p-4 glass-card mb-4">
                        <h5 class="fw-bold mb-3">Skills You Can Offer</h5>
                        <p class="text-muted small mb-2">Add skills you are good at and can teach others. Type skill name and press Enter or click Add.</p>
                        <div class="input-group mb-3">
                            <input type="text" class="form-control p-3 rounded-start-3" id="inputOfferSkill" placeholder="e.g. Python, Java, Data Structures...">
                            <button class="btn btn-primary px-4 fw-bold" id="btnOfferSkillAdd">Add Skill</button>
                        </div>
                        <div class="d-flex flex-wrap p-2 border rounded-3 bg-light" id="offeredTagsList">
                            <!-- Tags injected here -->
                        </div>
                    </div>

                    <div class="card border-0 p-4 glass-card">
                        <h5 class="fw-bold mb-3">Skills You Want to Learn</h5>
                        <p class="text-muted small mb-2">Add skills you want to learn from others.</p>
                        <div class="input-group mb-3">
                            <input type="text" class="form-control p-3 rounded-start-3" id="inputWantSkill" placeholder="e.g. AWS, Docker, Machine Learning...">
                            <button class="btn btn-secondary px-4 fw-bold" id="btnWantSkillAdd">Add Skill</button>
                        </div>
                        <div class="d-flex flex-wrap p-2 border rounded-3 bg-light" id="wantedTagsList">
                            <!-- Tags injected here -->
                        </div>
                    </div>
                </div>

                <!-- Skill Summary and Chart Panel -->
                <div class="col-lg-4">
                    <div class="card border-0 p-4 glass-card text-center mb-4">
                        <h5 class="fw-bold mb-4">Your Skill Summary</h5>
                        <div class="d-flex justify-content-center mb-4">
                            <div class="progress-ring-container">
                                <svg class="progress-ring" width="140" height="140">
                                    <circle class="progress-ring-circle-bg" cx="70" cy="70" r="60"/>
                                    <circle class="progress-ring-circle" id="summaryRing" cx="70" cy="70" r="60" stroke-dasharray="376.99" stroke-dashoffset="376.99"/>
                                </svg>
                                <div class="progress-ring-text">
                                    <span id="summaryTotalCount">0</span>
                                    <span>Total Skills</span>
                                </div>
                            </div>
                        </div>
                        <div class="row text-center mb-3">
                            <div class="col-6 border-end">
                                <h4 class="fw-bold text-success mb-0" id="summaryOfferCount">0</h4>
                                <small class="text-muted">Offered</small>
                            </div>
                            <div class="col-6">
                                <h4 class="fw-bold text-primary mb-0" id="summaryWantCount">0</h4>
                                <small class="text-muted">Wanted</small>
                            </div>
                        </div>
                        <div class="p-3 bg-light rounded-3 text-start small">
                            <i class="bi bi-lightbulb-fill text-warning me-1"></i>
                            <strong>Tip:</strong> Be specific with skill tags (e.g., 'AWS' instead of just 'Cloud') to get better matched suggestions!
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderSkillTags();

        // Listeners for adding skills
        document.getElementById('btnOfferSkillAdd').addEventListener('click', () => this.handleAddSkillInput('inputOfferSkill', 'offered'));
        document.getElementById('inputOfferSkill').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleAddSkillInput('inputOfferSkill', 'offered');
        });

        document.getElementById('btnWantSkillAdd').addEventListener('click', () => this.handleAddSkillInput('inputWantSkill', 'wanted'));
        document.getElementById('inputWantSkill').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleAddSkillInput('inputWantSkill', 'wanted');
        });
    },

    // Refresh tags render lists
    renderSkillTags() {
        const offeredContainer = document.getElementById('offeredTagsList');
        const wantedContainer = document.getElementById('wantedTagsList');
        
        const offered = this.state.user.skills.filter(s => s.type === 'offered');
        const wanted = this.state.user.skills.filter(s => s.type === 'wanted');

        // Offered Skills render
        if (offered.length === 0) {
            offeredContainer.innerHTML = '<span class="text-muted small p-2">No offered skills added.</span>';
        } else {
            offeredContainer.innerHTML = offered.map(s => `
                <span class="chip-item m-1 py-2 px-3 bg-success-subtle text-success border border-success-subtle">
                    ${s.skill_name}
                    <button class="chip-item-close" onclick="App.handleRemoveSkill(${s.id})">&times;</button>
                </span>
            `).join('');
        }

        // Wanted Skills render
        if (wanted.length === 0) {
            wantedContainer.innerHTML = '<span class="text-muted small p-2">No wanted skills added.</span>';
        } else {
            wantedContainer.innerHTML = wanted.map(s => `
                <span class="chip-item m-1 py-2 px-3 bg-primary-subtle text-primary border border-primary-subtle">
                    ${s.skill_name}
                    <button class="chip-item-close" onclick="App.handleRemoveSkill(${s.id})">&times;</button>
                </span>
            `).join('');
        }

        // Update counts
        const total = offered.length + wanted.length;
        document.getElementById('summaryTotalCount').innerText = total;
        document.getElementById('summaryOfferCount').innerText = offered.length;
        document.getElementById('summaryWantCount').innerText = wanted.length;

        // Render circular progress svg
        const ring = document.getElementById('summaryRing');
        if (ring) {
            const circumference = 2 * Math.PI * 60; // 376.99
            let percent = total > 0 ? (offered.length / total) * 100 : 0;
            const offset = circumference - (percent / 100) * circumference;
            ring.style.strokeDashoffset = offset;
        }
    },

    // Add Skill Action
    async handleAddSkillInput(inputId, type) {
        const input = document.getElementById(inputId);
        const name = input.value.trim();
        if (!name) return;

        try {
            await this.api('/api/skills', 'POST', { skill_name: name, type });
            input.value = '';
            // Refresh user state and re-render tags
            await this.checkAuth();
            this.renderSkillTags();
            this.showToast(`Added "${name}" to skills.`);
        } catch (err) {}
    },

    // Remove Skill Action
    async handleRemoveSkill(skillId) {
        try {
            await this.api(`/api/skills/${skillId}`, 'DELETE');
            // Refresh user state
            await this.checkAuth();
            this.renderSkillTags();
            this.showToast("Skill removed.");
        } catch (err) {}
    },

    // Match Discovery Page
    async renderMatches() {
        const contentArea = document.getElementById('appMainContentWrapper');
        contentArea.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold mb-1">Find Matches</h2>
                    <p class="text-muted mb-0">Find students who can exchange skills with you.</p>
                </div>
            </div>

            <!-- Matches Search & Filters Header -->
            <div class="card border-0 p-3 mb-4 glass-card">
                <div class="row g-2 align-items-center">
                    <div class="col-md-6">
                        <div class="input-group">
                            <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                            <input type="text" class="form-control border-start-0 ps-0" id="matchSearchInput" placeholder="Search skill, user, or college...">
                        </div>
                    </div>
                    <div class="col-md-6 d-flex justify-content-md-end gap-2 mt-2 mt-md-0">
                        <button class="btn btn-outline-primary px-3 rounded-pill active" id="btnFilterAll">All Matches</button>
                        <button class="btn btn-outline-primary px-3 rounded-pill" id="btnFilterMutual">Mutual Only</button>
                        <button class="btn btn-outline-primary px-3 rounded-pill" id="btnFilterOffers">I Need</button>
                    </div>
                </div>
            </div>

            <!-- Matches Cards Display Grid -->
            <div class="row g-4" id="matchesCardsGrid">
                <div class="col-12 text-center py-5 text-muted">
                    <div class="spinner-border text-primary mb-2" role="status"></div>
                    <p class="small">Matching profiles...</p>
                </div>
            </div>
        `;

        try {
            const matches = await this.api('/api/matches');
            this.state.matches = matches;
            this.displayFilteredMatches('', 'all');

            // Wire Search and Filters listeners
            const searchInput = document.getElementById('matchSearchInput');
            let filterType = 'all';

            const filterMatchesAction = () => {
                const query = searchInput.value.trim().toLowerCase();
                this.displayFilteredMatches(query, filterType);
            };

            searchInput.addEventListener('input', filterMatchesAction);

            document.getElementById('btnFilterAll').addEventListener('click', (e) => {
                document.querySelectorAll('[id^=btnFilter]').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                filterType = 'all';
                filterMatchesAction();
            });

            document.getElementById('btnFilterMutual').addEventListener('click', (e) => {
                document.querySelectorAll('[id^=btnFilter]').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                filterType = 'mutual';
                filterMatchesAction();
            });

            document.getElementById('btnFilterOffers').addEventListener('click', (e) => {
                document.querySelectorAll('[id^=btnFilter]').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                filterType = 'offers';
                filterMatchesAction();
            });

        } catch (err) {}
    },

    // Displays cards in matches grid depending on query and filter pill
    displayFilteredMatches(query, filter) {
        const grid = document.getElementById('matchesCardsGrid');
        if (!grid) return;

        let filtered = this.state.matches;

        // Apply filters
        if (filter === 'mutual') {
            filtered = filtered.filter(m => m.match_score >= 80);
        } else if (filter === 'offers') {
            // Checks if they offer what current user wants
            const wants = this.state.user.skills.filter(s => s.type === 'wanted').map(s => s.skill_name.toLowerCase());
            filtered = filtered.filter(m => m.skills_offered.some(so => wants.includes(so.toLowerCase())));
        }

        // Apply search query
        if (query) {
            filtered = filtered.filter(m => 
                m.name.toLowerCase().includes(query) || 
                (m.college && m.college.toLowerCase().includes(query)) ||
                m.skills_offered.some(s => s.toLowerCase().includes(query)) ||
                m.skills_wanted.some(s => s.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="bi bi-search fs-1 mb-3 d-block"></i>
                    <h5 class="fw-bold">No matches found</h5>
                    <p class="small mb-0">Try adjusting your filters or adding more skills in the Skills tab.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        filtered.forEach(match => {
            let connBtnClass = "btn-primary";
            let connText = "Connect";
            if (match.status === 'pending') {
                connBtnClass = "btn-secondary disabled";
                connText = "Pending Request";
            } else if (match.status === 'connected') {
                connBtnClass = "btn-success";
                connText = "Send Message";
            }

            const card = `
                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 p-4 shadow-sm rounded-4 h-100 bg-white glass-card-hover d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <img src="${match.profile_image}" class="rounded-circle" style="width: 60px; height: 60px; border: 2px solid #F1F5F9; background: #fff;">
                                <span class="badge text-success bg-success-subtle border border-success-subtle rounded-pill font-semibold px-3 py-2 fs-7">${match.match_score}% Match</span>
                            </div>
                            <h5 class="fw-bold mb-1">${match.name}</h5>
                            <p class="text-muted small mb-3"><i class="bi bi-mortarboard me-1"></i>${match.college} • ${match.year}</p>
                            
                            <div class="mb-3">
                                <h6 class="small text-muted fw-bold mb-2">OFFERS:</h6>
                                <div class="d-flex flex-wrap gap-1">
                                    ${match.skills_offered.map(s => `<span class="badge bg-success-subtle text-success">${s}</span>`).join('') || '<span class="text-muted small">None</span>'}
                                </div>
                            </div>
                            <div class="mb-4">
                                <h6 class="small text-muted fw-bold mb-2">WANTS:</h6>
                                <div class="d-flex flex-wrap gap-1">
                                    ${match.skills_wanted.map(s => `<span class="badge bg-primary-subtle text-primary">${s}</span>`).join('') || '<span class="text-muted small">None</span>'}
                                </div>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn ${connBtnClass} rounded-3 py-2 flex-grow-1 font-semibold text-sm" onclick="App.handleConnectClick(${match.id}, '${match.status}')">${connText}</button>
                            <a href="#profile/${match.id}" class="btn btn-light rounded-3 px-3"><i class="bi bi-eye"></i> View Profile</a>
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML += card;
        });
    },

    // Profile Page View
    async renderProfile(userId) {
        const contentArea = document.getElementById('appMainContentWrapper');
        contentArea.innerHTML = `
            <div class="text-center py-5 text-muted">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="small mt-2">Loading profile details...</p>
            </div>
        `;

        try {
            const profile = await this.api(`/api/profile/${userId}`);
            
            // Check status relation with current user
            let matchStatus = 'none';
            if (userId !== this.state.user.id) {
                // Fetch matches list to see connection state
                const matches = await this.api('/api/matches');
                const matchedObj = matches.find(m => m.id === userId);
                if (matchedObj) matchStatus = matchedObj.status;
            }

            let profileBtnHtml = '';
            if (userId === this.state.user.id) {
                profileBtnHtml = `<a href="#settings" class="btn btn-outline-primary px-4 py-2 rounded-3 fw-bold"><i class="bi bi-pencil-square me-1"></i>Edit Profile</a>`;
            } else {
                let connClass = "btn-primary";
                let connText = "Connect";
                if (matchStatus === 'pending') {
                    connClass = "btn-secondary disabled";
                    connText = "Pending Approval";
                } else if (matchStatus === 'connected') {
                    connClass = "btn-success";
                    connText = "Send Message";
                }
                profileBtnHtml = `<button class="btn ${connClass} px-4 py-2 rounded-3 fw-bold" onclick="App.handleConnectClick(${profile.id}, '${matchStatus}')">${connText}</button>`;
            }

            const offered = profile.skills.filter(s => s.type === 'offered').map(s => s.skill_name);
            const wanted = profile.skills.filter(s => s.type === 'wanted').map(s => s.skill_name);

            contentArea.innerHTML = `
                <div class="card border-0 glass-card overflow-hidden mb-4">
                    <div class="profile-cover"></div>
                    <div class="profile-avatar-container">
                        <img src="${profile.profile_image}" class="profile-avatar" style="background:#fff;">
                        <div class="profile-avatar-name flex-grow-1">
                            <h3 class="fw-bold mb-0 text-white text-shadow">${profile.name}</h3>
                            <p class="text-light mb-0 small" style="opacity: 0.95;"><i class="bi bi-mortarboard-fill me-1"></i>${profile.college} • ${profile.branch} • ${profile.year}</p>
                        </div>
                        <div class="pe-4 pb-2">
                            ${profileBtnHtml}
                        </div>
                    </div>
                    
                    <div class="profile-body-content">
                        <div class="row g-4">
                            <div class="col-lg-8">
                                <!-- About Section -->
                                <div class="mb-4">
                                    <h5 class="fw-bold border-bottom pb-2 mb-3"><i class="bi bi-person-lines-fill me-2 text-primary"></i>About Me</h5>
                                    <p class="text-muted lh-lg mb-0">${profile.bio || "No biography provided yet."}</p>
                                </div>

                                <!-- Skills Exchange Grid -->
                                <div class="row g-4 mb-4">
                                    <div class="col-md-6">
                                        <div class="card border p-3 rounded-4 bg-light h-100">
                                            <h6 class="fw-bold text-success mb-3"><i class="bi bi-arrow-up-circle-fill me-2"></i>Skills Offered</h6>
                                            <div class="d-flex flex-wrap gap-1">
                                                ${offered.map(s => `<span class="badge bg-success-subtle text-success py-2 px-3 rounded-pill">${s}</span>`).join('') || '<span class="text-muted small">No offered skills.</span>'}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card border p-3 rounded-4 bg-light h-100">
                                            <h6 class="fw-bold text-primary mb-3"><i class="bi bi-arrow-down-circle-fill me-2"></i>Skills Wanted</h6>
                                            <div class="d-flex flex-wrap gap-1">
                                                ${wanted.map(s => `<span class="badge bg-primary-subtle text-primary py-2 px-3 rounded-pill">${s}</span>`).join('') || '<span class="text-muted small">No wanted skills.</span>'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Sidebar details -->
                            <div class="col-lg-4">
                                <div class="card border-0 p-4 rounded-4 bg-light">
                                    <h5 class="fw-bold mb-4">Activity Stats</h5>
                                    <div class="d-flex align-items-center gap-3 mb-3 border-bottom pb-3">
                                        <i class="bi bi-star-fill text-warning fs-3"></i>
                                        <div>
                                            <h5 class="fw-bold mb-0">${profile.rating}</h5>
                                            <small class="text-muted">Student Rating</small>
                                        </div>
                                    </div>
                                    <div class="d-flex align-items-center gap-3 mb-3 border-bottom pb-3">
                                        <i class="bi bi-arrow-left-right text-primary fs-3"></i>
                                        <div>
                                            <h5 class="fw-bold mb-0">${profile.exchanges_count}</h5>
                                            <small class="text-muted">Total Exchanges</small>
                                        </div>
                                    </div>
                                    <div class="d-flex align-items-center gap-3">
                                        <i class="bi bi-calendar-check text-success fs-3"></i>
                                        <div>
                                            <h6 class="fw-semibold mb-0" style="font-size: 14px;">${profile.availability || "Flexible"}</h6>
                                            <small class="text-muted">Availability</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {}
    },

    // Messages View
    async renderMessages() {
        const contentArea = document.getElementById('appMainContentWrapper');
        contentArea.innerHTML = `
            <div class="mb-4">
                <h2 class="fw-bold mb-1">Messages</h2>
                <p class="text-muted mb-0">Chat with connected students to coordinate skill swap sessions.</p>
            </div>

            <div class="chat-container shadow-sm">
                <!-- Chat Left Sidebar -->
                <div class="chat-sidebar">
                    <div class="chat-sidebar-search">
                        <div class="input-group">
                            <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                            <input type="text" class="form-control border-start-0 ps-0" placeholder="Search conversations...">
                        </div>
                    </div>
                    <div class="chat-user-list" id="chatConversationsList">
                        <div class="text-center py-4 text-muted small">Loading connections...</div>
                    </div>
                </div>

                <!-- Chat Main Body -->
                <div class="chat-main" id="chatMainBox">
                    <div class="d-flex flex-column h-100 justify-content-center align-items-center text-muted">
                        <i class="bi bi-chat-dots fs-1 mb-3"></i>
                        <h5>No Conversation Selected</h5>
                        <p class="small mb-0">Select a connected student from the sidebar list to start chatting.</p>
                    </div>
                </div>
            </div>
        `;

        try {
            // Load matches to find "connected" users
            const matches = await this.api('/api/matches');
            const connections = matches.filter(m => m.status === 'connected');
            
            const convoList = document.getElementById('chatConversationsList');
            if (connections.length === 0) {
                convoList.innerHTML = `
                    <div class="text-center py-5 text-muted px-3">
                        <i class="bi bi-emoji-smile fs-3 mb-2 d-block"></i>
                        <p class="small mb-0">No active connections yet. Request exchanges in the Matches tab!</p>
                    </div>
                `;
                return;
            }

            convoList.innerHTML = '';
            connections.forEach(conn => {
                const item = document.createElement('div');
                item.className = `chat-user-item ${this.state.activeChatUser === conn.id ? 'active' : ''}`;
                item.innerHTML = `
                    <img src="${conn.profile_image}" class="chat-user-avatar">
                    <div class="chat-user-info">
                        <h6>${conn.name}</h6>
                        <p class="small text-muted">${conn.college}</p>
                    </div>
                `;
                item.addEventListener('click', () => {
                    document.querySelectorAll('.chat-user-item').forEach(x => x.classList.remove('active'));
                    item.classList.add('active');
                    this.openChat(conn);
                });
                convoList.appendChild(item);
            });

            // Automatically open chat if set
            if (this.state.activeChatUser) {
                const selected = connections.find(c => c.id === this.state.activeChatUser);
                if (selected) {
                    this.openChat(selected);
                }
            }

        } catch (err) {}
    },

    // Open Chat window with connection
    openChat(user) {
        this.state.activeChatUser = user.id;

        // Clear existing interval
        if (this.state.chatPollInterval) {
            clearInterval(this.state.chatPollInterval);
        }

        const chatBox = document.getElementById('chatMainBox');
        chatBox.innerHTML = `
            <!-- Chat Window Header -->
            <div class="chat-header">
                <div class="d-flex align-items-center gap-3">
                    <img src="${user.profile_image}" class="chat-user-avatar" style="width: 42px; height: 42px;">
                    <div>
                        <h6 class="fw-bold mb-0">${user.name}</h6>
                        <small class="text-muted">${user.college} • ${user.branch}</small>
                    </div>
                </div>
                <a href="#profile/${user.id}" class="btn btn-outline-primary btn-sm rounded-pill"><i class="bi bi-eye me-1"></i>View Profile</a>
            </div>

            <!-- Messages Stream -->
            <div class="chat-messages" id="chatMessageStream">
                <!-- Messages load dynamically -->
            </div>

            <!-- Text Input send field -->
            <div class="chat-input-area">
                <input type="text" id="chatMsgInput" placeholder="Type a message to organize your exchange..." autocomplete="off">
                <button class="chat-send-btn" id="chatMsgSendBtn"><i class="bi bi-send-fill"></i></button>
            </div>
        `;

        // Load messages initially
        this.pollMessages();

        // Start message polling every 3 seconds to mock live chat
        this.state.chatPollInterval = setInterval(() => this.pollMessages(), 3000);

        // Bind Message send click
        document.getElementById('chatMsgSendBtn').addEventListener('click', () => this.sendMessageAction());
        document.getElementById('chatMsgInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessageAction();
        });
    },

    // Poll messages API
    async pollMessages() {
        if (!this.state.activeChatUser) return;
        try {
            const stream = document.getElementById('chatMessageStream');
            if (!stream) return;

            const messages = await this.api(`/api/messages/${this.state.activeChatUser}`);
            
            // Check if messages count has changed before re-rendering (prevent jumpy scrolling)
            if (messages.length === this.state.messages.length && stream.children.length > 0) {
                return;
            }

            this.state.messages = messages;
            stream.innerHTML = '';
            
            if (messages.length === 0) {
                stream.innerHTML = `<p class="text-center text-muted small py-5">No messages. Type below to say hi!</p>`;
                return;
            }

            messages.forEach(msg => {
                const isSent = msg.sender_id === this.state.user.id;
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const msgHtml = `
                    <div class="chat-msg-bubble ${isSent ? 'chat-msg-sent' : 'chat-msg-received'}">
                        ${msg.message_text}
                        <span class="chat-msg-time">${timeStr}</span>
                    </div>
                `;
                stream.innerHTML += msgHtml;
            });

            // Scroll to bottom
            stream.scrollTop = stream.scrollHeight;
        } catch (err) {}
    },

    // Message Send click
    async sendMessageAction() {
        const input = document.getElementById('chatMsgInput');
        const text = input.value.trim();
        if (!text) return;

        try {
            await this.api('/api/messages', 'POST', {
                receiver_id: this.state.activeChatUser,
                message_text: text
            });
            input.value = '';
            // Instantly poll to render
            await this.pollMessages();
        } catch (err) {}
    },

    // Profile Settings View
    renderSettings() {
        const contentArea = document.getElementById('appMainContentWrapper');
        contentArea.innerHTML = `
            <div class="mb-4">
                <h2 class="fw-bold mb-1">Account Settings</h2>
                <p class="text-muted mb-0">Update your profile biography, availability, and student details.</p>
            </div>

            <div class="row g-4">
                <div class="col-lg-8">
                    <div class="card border-0 p-4 glass-card">
                        <h5 class="fw-bold mb-4">Edit Profile Info</h5>
                        <form id="settingsForm">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Full Name</label>
                                    <input type="text" class="form-control p-3 rounded-3" id="setNavName" value="${this.state.user.name}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">College / University</label>
                                    <input type="text" class="form-control p-3 rounded-3" id="setNavCollege" value="${this.state.user.college || ''}" required>
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Branch / Major</label>
                                    <input type="text" class="form-control p-3 rounded-3" id="setNavBranch" value="${this.state.user.branch || ''}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Year of Study</label>
                                    <select class="form-select p-3 rounded-3" id="setNavYear">
                                        <option value="1st Year" ${this.state.user.year === '1st Year' ? 'selected' : ''}>1st Year</option>
                                        <option value="2nd Year" ${this.state.user.year === '2nd Year' ? 'selected' : ''}>2nd Year</option>
                                        <option value="3rd Year" ${this.state.user.year === '3rd Year' ? 'selected' : ''}>3rd Year</option>
                                        <option value="4th Year" ${this.state.user.year === '4th Year' ? 'selected' : ''}>4th Year</option>
                                    </select>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold">Exchange Availability</label>
                                <input type="text" class="form-control p-3 rounded-3" id="setNavAvailability" value="${this.state.user.availability || 'Weekends & Evenings'}" placeholder="e.g. Weekends, Daily (7PM - 9PM)" required>
                            </div>

                            <div class="mb-4">
                                <label class="form-label small fw-bold">Profile Bio</label>
                                <textarea class="form-control p-3 rounded-3" id="setNavBio" rows="3" required>${this.state.user.bio || ''}</textarea>
                            </div>

                            <div class="mb-4">
                                <label class="form-label small fw-bold">Avatar Seed (Dicebear)</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-white small">https://api.dicebear.com/7.x/adventurer/svg?seed=</span>
                                    <input type="text" class="form-control p-3" id="setAvatarSeed" value="${this.state.user.name}" placeholder="Type name for random avatar">
                                </div>
                            </div>

                            <button type="submit" class="btn btn-primary px-5 py-3 rounded-3 fw-bold">Save Profile Changes</button>
                        </form>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card border-0 p-4 glass-card text-center">
                        <h5 class="fw-bold mb-3">Profile Preview</h5>
                        <img src="${this.state.user.profile_image}" class="rounded-circle border border-3 border-primary mx-auto mb-3" style="width: 120px; height: 120px; background:#fff;">
                        <h5 class="fw-bold mb-1">${this.state.user.name}</h5>
                        <p class="text-muted small">${this.state.user.college || 'No College'}</p>
                        <p class="small text-muted mb-0">Avatar is dynamically synced. Saving settings will reload changes instantly.</p>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('setNavName').value;
            const college = document.getElementById('setNavCollege').value;
            const branch = document.getElementById('setNavBranch').value;
            const year = document.getElementById('setNavYear').value;
            const availability = document.getElementById('setNavAvailability').value;
            const bio = document.getElementById('setNavBio').value;
            const seed = document.getElementById('setAvatarSeed').value.trim() || name;

            const profile_image = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;

            try {
                const response = await this.api('/api/profile', 'PUT', {
                    name, college, branch, year, availability, bio, profile_image
                });
                this.state.user = response;
                this.showToast("Profile settings saved!");
                this.handleRouting();
            } catch (err) {}
        });
    }
};

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
