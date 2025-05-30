var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres-db").AddDatabase("aiImageDetect");

builder.AddProject<Projects.AIImageDetect_Api>("aiimagedetect-api")
    .WithReference(postgres);

builder.Build().Run();
