// This script handles navigation between the different sections in the user dashboard

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
                document.getElementById(targetId).classList.add('active');
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
            document.querySelectorAll('.sidebar-link').forEach(sidebarLink => sidebarLink.classList.remove('active'));
            this.classList.add('active');
            
            // Show the correct content section
            const contentSections = document.querySelectorAll('.content-section');
            contentSections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Mobile responsive adjustments
    function adjustForMobile() {
        if (window.innerWidth < 768) {
            // On mobile, close the navbar after clicking a link
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    const navbarCollapse = document.querySelector('.navbar-collapse');
                    if (navbarCollapse.classList.contains('show')) {
                        document.querySelector('.navbar-toggler').click();
                    }
                });
            });
        }
    }

    // Call on page load and window resize
    adjustForMobile();
    window.addEventListener('resize', adjustForMobile);
});