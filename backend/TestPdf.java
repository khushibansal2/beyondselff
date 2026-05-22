import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.Loader;
public class TestPdf {
    public static void main(String[] args) throws Exception {
        byte[] data = new byte[0];
        try {
            PDDocument doc = Loader.loadPDF(data);
            System.out.println("Success");
        } catch (Exception e) {
            System.out.println("Exception: " + e.getMessage());
        }
    }
}
