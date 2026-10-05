export function SortingHatFrame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      className="block h-[calc(100dvh-8.5rem)] w-full border-0 bg-background lg:h-full lg:min-h-0"
    />
  );
}
