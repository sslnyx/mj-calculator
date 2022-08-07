import React from "react";

const Modal = ({ children, modalRef, backdropRef, id, closeModal }) => {
  const childrenWithProps = React.Children.map(children, (child) => {
    // Checking isValidElement is the safe way and avoids a typescript
    // error too.
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { id });
    }
    return child;
  });

  return (
    <>
      <div
        onClick={() => closeModal(id)}
        ref={(el) => (backdropRef.current[id] = el)}
        className="modal-backdrop fade"
      ></div>

      <div
        ref={(el) => (modalRef.current[id] = el)}
        className="modal fade fixed top-0 left-0 w-full h-full outline-none overflow-x-hidden overflow-y-auto"
        tabIndex="-1"
        aria-labelledby="exampleModalCenterTitle"
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog modal-dialog-centered relative w-auto">
          <div className="modal-content border-none shadow-lg relative flex flex-col w-full bg-white bg-clip-padding rounded-md outline-none text-current">
            <div className="modal-body relative p-4">{childrenWithProps}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
