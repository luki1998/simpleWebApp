const appTitle: string = "Welcome to simpleWebApp";

function updateTitle(): void {
    const heading = document.querySelector<HTMLHeadingElement>("h1");
    if (heading) {
        heading.textContent = appTitle;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    updateTitle();
});