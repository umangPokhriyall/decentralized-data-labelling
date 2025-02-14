
import { Button } from "@repo/ui/button";
import { Appbar } from "../components/Appbar";
import { UploadImage } from "../components/UploadImage";
import { Hero } from "@/components/Hero";
import { Upload } from "@/components/Upload";



export default function Home() {
  return (
    <main>

      <Appbar />
      <Hero />
      {/* <UploadImage /> */}
      <Upload />
    </main>


  );
}
