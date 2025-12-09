export default function ContactUs() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container-main padding-y-xl">
        <h1 className="heading-1 margin-bottom-lg">Contact Us</h1>
        <div className="card">
          <div className="spacing-y-md">
            <h2 className="heading-3 margin-bottom-md">Get in Touch</h2>
            <div className="spacing-y-sm">
              <p><strong>Phone:</strong> <a href="tel:+972548740666">0548740666</a></p>
              <p><strong>WhatsApp:</strong> <a href="https://wa.me/+972548740666" target="_blank" rel="noopener noreferrer">0548740666</a></p>
              <p><strong>Email:</strong> <a href="mailto:info@kingsmansaddlery.com">info@kingsmansaddlery.com</a></p>
              <p><strong>Address:</strong> 123 Saddlery Lane, Horse Country, ST 12345</p>
            </div>
            <div className="margin-top-md">
              <h3 className="heading-3 margin-bottom-sm">Business Hours</h3>
              <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
              <p>Saturday: 10:00 AM - 4:00 PM</p>
              <p>Sunday: Closed</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}





