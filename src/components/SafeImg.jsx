import React from 'react';

const SafeImg = ({ src, alt = '', className = '', style = {}, onClick, ...props }) => {
  const handleAuxClick = (e) => {
    // prevent middle-click (open in new tab)
    if (e.button === 1) e.preventDefault();
    if (props.onAuxClick) props.onAuxClick(e);
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onAuxClick={handleAuxClick}
      onClick={onClick}
      {...props}
    />
  );
};

export default SafeImg;
