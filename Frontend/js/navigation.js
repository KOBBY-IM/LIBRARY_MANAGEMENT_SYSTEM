
document.addEventListener('DOMContentLoaded', function() {
    // Handle navigation from navbar links
    const navLinks = document.querySelectorAll('.navbar .nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                
                // Get the target section ID
                const targetId = this.getAttribute('href').substring(1);
                
                // Update active nav link in navbar
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                this.classList.add('active');
                
                // Also update the corresponding sidebar link
                const sidebarLink = document.querySelector(`.sidebar-link[href="#${targetId}"]`);
                if (sidebarLink) {
                    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
                    sidebarLink.classList.add('active');
                }
                
                // Show the correct content section
                const contentSections = document.querySelectorAll('.content-section');
                contentSections.forEach(section => section.classList.remove('active'));
                
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                    
                    // Scroll to top of the section on mobile for better UX
                    if (window.innerWidth < 768) {
                        targetSection.scrollIntoView({behavior: 'smooth'});
                    }
                }
            }
        });
    });

    // Handle navigation from sidebar links
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target section ID
            const targetId = this.getAttribute('href').substring(1);
            
            // Update active sidebar link
            document.querySelectorAll('.sidebar-link').forEach(sidebarLink => 
                sidebarLink.classList.remove('active'));
            this.classList.add('active');
            
            // Show the correct content section
            const contentSections = document.querySelectorAll('.content-section');
            contentSections.forEach(section => section.classList.remove('active'));
            
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // Mobile responsive adjustments
    function adjustForMobile() {
        if (window.innerWidth < 768) {
            // On mobile, close the navbar after clicking a link
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    const navbarCollapse = document.querySelector('.navbar-collapse');
                    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                        const navbarToggler = document.querySelector('.navbar-toggler');
                        if (navbarToggler) {
                            navbarToggler.click();
                        }
                    }
                });
            });
            
            // Same for sidebar links on mobile
            sidebarLinks.forEach(link => {
                link.addEventListener('click', function() {
                    // If there's a mobile sidebar toggle, handle it here
                    const mobileSidebarToggle = document.querySelector('.mobile-sidebar-toggle');
                    if (mobileSidebarToggle && document.querySelector('.sidebar-menu').classList.contains('show')) {
                        mobileSidebarToggle.click();
                    }
                });
            });
        }
    }

    // Call on page load and window resize
    adjustForMobile();
    window.addEventListener('resize', adjustForMobile);
    
    // Prevent content from affecting sidebar by ensuring proper height containment
    function adjustContentHeight() {
        const contentSections = document.querySelectorAll('.content-section');
        const mainContentArea = document.querySelector('.col-md-9');
        
        if (mainContentArea) {
            contentSections.forEach(section => {
                // Ensure each section's height doesn't overflow its container
                if (section.classList.contains('active')) {
                    section.style.maxHeight = `${window.innerHeight - 100}px`;
                    section.style.overflowY = 'auto';
                }
            });
        }
    }
    
    // Apply on load and resize
    adjustContentHeight();
    window.addEventListener('resize', adjustContentHeight);
});