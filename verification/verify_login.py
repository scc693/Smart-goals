from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app
            page.goto("http://localhost:3000/login")

            # Wait for content to load
            page.wait_for_load_state("networkidle")

            # Take screenshot of login page
            page.screenshot(path="verification/login_page.png")
            print("Login page screenshot saved")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app()
