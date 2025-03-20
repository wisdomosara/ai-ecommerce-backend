const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  return password.length >= 6;
};

const validateAddress = (address) => {
  return (
    address &&
    address.street &&
    address.city && 
    address.state &&
    address.country &&
    address.zipCode
  );
};

const validateStore = (store) => {
  return (
    store.name &&
    store.description &&
    validateEmail(store.contactEmail) &&
    validatePhone(store.contactPhone)
  );
};

const validateProduct = (product) => {
  return (
    product.name &&
    product.description &&
    product.price > 0 &&
    product.stock >= 0 &&
    product.category &&
    product.store &&
    Array.isArray(product.images) &&
    product.images.length > 0
  );
};

module.exports = {
  validateEmail,
  validatePhone,
  validatePassword,
  validateAddress,
  validateStore,
  validateProduct
};
