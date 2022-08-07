const PrimaryBtn = ({ children, className, onClick }) => {
  return <button onClick={onClick} className={`py-2 px-5 rounded text-white ${className}`}>{children}</button>;
};

export default PrimaryBtn;
