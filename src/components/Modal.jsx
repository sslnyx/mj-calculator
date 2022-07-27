const Modal = ({ children, modalRef, backdropRef, closeModal }) => {
  return (
    <>
      <div
        onClick={closeModal}
        ref={backdropRef}
        className="modal-backdrop fade"
      ></div>

      <div
        ref={modalRef}
        className="modal fade fixed top-0 left-0 w-full h-full outline-none overflow-x-hidden overflow-y-auto"
        id="exampleModalCenter"
        tabIndex="-1"
        aria-labelledby="exampleModalCenterTitle"
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog modal-dialog-centered relative w-auto">
          <div className="modal-content border-none shadow-lg relative flex flex-col w-full bg-white bg-clip-padding rounded-md outline-none text-current">
            <div className="modal-body relative p-4">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
