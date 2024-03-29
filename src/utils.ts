import axios from "axios";

export enum PersistenStorage {
  ThreadJobMapping = "ThreadJobMapping",
}

export const postData = async (
  input: string,
  path: string
): Promise<{ status: string; data: any }> => {
  try {
    console.log(input);
    const url = `${process.env.SHINKAI_NODE_URL}${path}`;
    const response = await axios.post(url, input, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  } catch (error) {
    console.error(error);
    console.error(
      "Error during POST request:",
      (error as any).response.data.error
    );
    return { status: "error", data: (error as any).response.data.error };
  }
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
