const announcements = [
  "Free delivery inside Kathmandu Valley",
  "0% EMI available on major cards",
  "Official warranty on every product",
];

export function AnnouncementBar() {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex h-9 w-full max-w-7xl items-center justify-center gap-6 px-4 text-center font-medium text-xs sm:px-6 lg:px-8">
        {announcements.map((text, index) => (
          <span
            key={text}
            className={index > 0 ? "hidden md:inline" : undefined}
          >
            {text}
            {index < announcements.length - 1 && (
              <span
                aria-hidden="true"
                className="ms-6 hidden text-primary-foreground/40 md:inline"
              >
                •
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
