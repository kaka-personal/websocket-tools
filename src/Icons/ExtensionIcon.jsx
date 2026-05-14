import React from 'react';

const ExtensionIcon = ({ 
  size = 512, 
  backgroundColor = "#123447", 
  primaryColor = "#eefbff", 
  accentColor = "#58e1ff",
  secondaryColor = "#119fc4",
  className = "",
  style = {},
  ...props 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className={className}
      style={style}
      {...props}
    >
      <rect 
        id="background" 
        width="512" 
        height="512" 
        x="0" 
        y="0" 
        rx="12.5%" 
        fill={backgroundColor}
        stroke="#FFFFFF" 
        strokeWidth="0" 
        strokeOpacity="100%" 
        paintOrder="stroke"
      />
      <clipPath id="clip">
        <use xlinkHref="#background"/>
      </clipPath>
      <defs>
        <radialGradient 
          id="radialGradient" 
          cx="0" 
          cy="0" 
          r="1" 
          gradientUnits="userSpaceOnUse" 
          gradientTransform="translate(256) rotate(90) scale(512)"
        >
          <stop stopColor="white"/>
          <stop offset="1" stopColor="white" stopOpacity="0"/>
        </radialGradient>
      </defs>
      
      {/* Activity/Signal Icon */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 16 16" 
        width="352" 
        height="352" 
        x="80" 
        y="82" 
        style={{ color: primaryColor }} 
        transform="translate(-50, -50) scale(1.2)"
      >
        <path 
          stroke="currentColor" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="1.5" 
          d="M1.75 8.75h1.5l2.75-7 2 12.5 3-8.5 1.75 3h1.5"
        />
      </svg>
      
      {/* Certificate/Badge Icon */}
      <g transform="translate(300, 75) scale(0.55) rotate(-34)">
        <path 
          d="M216.82,70.174l-61.951-56.333c-2.123-1.93-5.158-2.479-7.818-1.42L4.727,69.049c-3.061,1.218-4.93,4.271-4.703,7.489C0.014,76.698,0,76.856,0,77.017v32.078c0,4.143,3.357,7.5,7.5,7.5c14.104,0,25.576,11.474,25.576,25.577S21.604,167.751,7.5,167.751c-4.143,0-7.5,3.357-7.5,7.5v24.977c0,4.143,3.357,7.5,7.5,7.5h204.598c4.143,0,7.5-3.357,7.5-7.5V77.017c0-0.103-0.01-0.204-0.016-0.307c0.021-0.229,0.035-0.459,0.035-0.693C219.617,73.655,218.525,71.549,216.82,70.174z M148.242,28.09l44.459,40.428H46.637L148.242,28.09z M204.598,192.728H15v-10.673c18.803-3.528,33.076-20.07,33.076-39.883S33.803,105.818,15,102.290V83.517h189.598V192.728z" 
          fill={accentColor}
        />
        <circle cx="174.094" cy="119.719" r="10.035" fill={secondaryColor}/>
        <circle cx="76.621" cy="128.903" r="10.44" fill={secondaryColor}/>
        <circle cx="150.315" cy="155.175" r="14.25" fill={secondaryColor}/>
        <circle cx="98.102" cy="166.85" r="11.815" fill={secondaryColor}/>
        <circle cx="122.855" cy="109.572" r="12.344" fill={secondaryColor}/>
      </g>
    </svg>
  );
};

export default ExtensionIcon;
