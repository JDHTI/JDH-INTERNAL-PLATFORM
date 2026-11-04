import { HOME_VIDEO_POSTER, HOME_VIDEO_SRC, resolveHomeVideo } from "../inicio.config"

/**
 * Slide 1 del slider de la home: video corporativo. Server Component. Si
 * `HOME_VIDEO_SRC` resuelve a un link de YouTube/Vimeo (`resolveHomeVideo`),
 * se embebe en un `<iframe>` con autoplay; si es un archivo propio, se sirve
 * con el `<video>` nativo, también en autoplay. En ambos casos arranca
 * silenciado — es la única forma en que los navegadores permiten autoplay,
 * no hay manera de evitarlo — y el usuario reactiva el audio desde los
 * controles.
 *
 * Alto fijo en 440px — el mismo tamaño `xl` que ya usaba `OverlayCard` para
 * las noticias (tomado como referencia), para que las 3 casillas del slider
 * midan exactamente igual.
 */
export function HomeVideoSlide() {
  const video = resolveHomeVideo(HOME_VIDEO_SRC)

  return (
    <div className="h-[440px] overflow-hidden rounded-[var(--jdh-radius-md)] bg-[var(--color-ink)]">
      {video.kind === "iframe" ? (
        <iframe
          src={video.embedUrl}
          title={video.title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <video
          autoPlay
          muted
          controls
          playsInline
          poster={HOME_VIDEO_POSTER}
          className="h-full w-full object-cover"
        >
          <source src={video.src} />
        </video>
      )}
    </div>
  )
}
