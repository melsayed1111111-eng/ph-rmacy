import React from 'react'

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  unoptimized?: boolean
  fill?: boolean
}

export default function Image({ unoptimized, fill, className, alt = '', src, ...props }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      {...props}
    />
  )
}
