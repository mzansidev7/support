import Swal from "sweetalert2";

export const successMessage = ({ title, text }) => {
  Swal.fire({
    title: title || "Good job!",
    text: text || "You clicked the button!",
    icon: "success",
  });
};

export const errorMessage = ({ title, text }) => {
  Swal.fire({
    title: title || "Oops...",
    text: text || "Something went wrong!",
    icon: "error",
  });
};

export const basicMessage = ({ text }) => {
  Swal.fire({
    text: text || "SweetAlert2 is working!",
  });
};

export const showErrorAlert = (message) => {
  Swal.fire({
    icon: "error",
    title: "Oops...",
    text: message || "Something went wrong!",
  });
};

export const showSuccessAlert = ({ title }) => {
  Swal.fire({
    title: title || "Success!",
    icon: "success",
    draggable: true,
  });
};

export const showConfirmationAlert = ({
  title,
  text,
  confirmButtonText,
  denyButtonText,
  zIndex,
}) => {
  return Swal.fire({
    title: title || "Do you want to save the changes?",
    text: text || "Once saved, you won't be able to edit this later.",
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: confirmButtonText || "Save",
    denyButtonText: denyButtonText || `Don't save`,
    ...(zIndex === undefined ? {} : { zIndex }),
  });
};

export const showDeleteConfirmationAlert = ({ title, text }) => {
  return Swal.fire({
    title: title || "Are you sure?",
    text: text || "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });
};

export const swalWithBootstrapButtons = Swal.mixin({
  customClass: {
    confirmButton: "btn btn-success",
    cancelButton: "btn btn-danger",
  },
  buttonsStyling: false,
});

export const showDeleteConfirmationWithBootstrapButtons = ({ title, text }) => {
  swalWithBootstrapButtons
    .fire({
      title: title || "Are you sure?",
      text: text || "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true,
    })
    .then((result) => {
      if (result.isConfirmed)
        swalWithBootstrapButtons.fire({
          title: "Deleted!",
          text: "Your file has been deleted.",
          icon: "success",
        });
      else if (result.dismiss === Swal.DismissReason.cancel)
        /* Read more about handling dismissals below */
        swalWithBootstrapButtons.fire({
          title: "Cancelled",
          text: "Your imaginary file is safe :)",
          icon: "error",
        });
    });
};
